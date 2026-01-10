import { Octokit } from '@octokit/rest';

type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
};

export async function commitFilesToGitHub(params: {
  token: string;
  config: GitHubConfig;
  message: string;
  files: Array<{ path: string; contentBase64: string }>;
}): Promise<{ commitSha: string }> {
  const { token, config, message, files } = params;
  const octokit = new Octokit({ auth: token });

  const { owner, repo, branch } = config;

  // 1) Get current head SHA
  const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const headSha = ref.data.object.sha;

  // 2) Get current commit and tree
  const commit = await octokit.git.getCommit({ owner, repo, commit_sha: headSha });
  const baseTreeSha = commit.data.tree.sha;

  // 3) Create blobs
  const blobs = await Promise.all(
    files.map(async (f) => {
      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: f.contentBase64,
        encoding: 'base64',
      });
      return { path: f.path, sha: blob.data.sha };
    }),
  );

  // 4) Create tree
  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs.map((b) => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })),
  });

  // 5) Create commit
  const newCommit = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.data.sha,
    parents: [headSha],
  });

  // 6) Update ref
  await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.data.sha, force: false });

  return { commitSha: newCommit.data.sha };
}
