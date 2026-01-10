# Publishing approved images to GitHub

## How it works

- Admin approves images via the admin endpoints.
- Admin calls `POST /admin/commit`.
- The backend:
  - downloads approved images from S3
  - creates a single commit on the configured branch
  - updates each image record with `commitSha` and `PUBLISHED`
  - optionally deletes the objects from S3

## Credentials

Use **AWS Secrets Manager** to store a GitHub token.

Recommended: GitHub fine-grained PAT with permissions to write contents for your repo.

Secret value must be JSON:

```json
{ "token": "ghp_..." }
```

SAM expects env vars:
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_TOKEN_SECRET_ARN`

## Notes

If GitHub is down or the token is invalid, the commit endpoint returns an error and does not mark images as published.
