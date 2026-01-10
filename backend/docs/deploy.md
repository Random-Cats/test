# Deploy (AWS SAM)

## Prereqs

- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed
- Node.js 20+
- Docker Desktop (required for the container-image NSFW processor)

## Deploy

From the `backend/` folder:

1) Install dependencies:

```bash
npm install
```

2) Make `esbuild` discoverable for SAM builds

SAM's esbuild builder expects an `esbuild` binary on your PATH. The simplest way on Windows is to run the provided deploy script, which prepends `node_modules/.bin` to PATH for you.

3) Build:

```bash
sam build
```
This project includes one Lambda that is deployed as a **container image** (`ProcessUploadFunction`) so that ML/native dependencies (nsfwjs/tfjs-node/sharp) work reliably.

4) Guided deploy:

```bash
sam deploy --guided
```

During `--guided`, choose:
- region
- stack name (e.g. `randomcatclicker-backend`)
- confirm IAM changes

## After deploy

SAM outputs:
- `ApiUrl`
- `UserPoolId`
- `UserPoolClientId`
- `UploadsBucketName`
- `ImagesTableName`
 
## GitHub publishing params

During guided deploy (or later via stack parameters), set:

- `GitHubOwner`
- `GitHubRepo`
- `GitHubBranch`
- `GitHubTokenSecretArn`

You will also need to:
- create an admin user and add them to the `admin` group
- configure the GitHub secret (see [github-commit.md](github-commit.md))
