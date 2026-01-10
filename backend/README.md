# RandomCatClicker Backend (AWS SAM)

This folder contains **all backend code + docs** for the RandomCatClicker project.

## What this backend does

- Users authenticate with **Amazon Cognito** (single user pool)
- Users request an upload via an **authorized API** endpoint
- Users upload images to S3 using a **presigned upload**
- An S3-triggered Lambda validates file type (`.jpg/.png/.webp`) and runs an **NSFW filter step** (pluggable)
- Admins (Cognito `admin` group) review + approve images
- Admins can "commit" approved images, which pushes them into a GitHub repo
- A tiny metrics endpoint emits CloudWatch metrics for Grafana dashboards

## Repo navigation

- [docs/index.md](docs/index.md) – start here
- [template.yaml](template.yaml) – SAM infrastructure
- [src/handlers](src/handlers) – Lambda handlers (API + S3 events)
- [src/lib](src/lib) – shared helpers (auth, validation, DynamoDB)
- [tests](tests) – unit tests
- [ml-process](ml-process) – container-image Lambda for NSFW filtering (nsfwjs)

## Quick start (local)

From this folder:

- Install deps: `npm install`
- Run unit tests: `npm test`

## Dependency safety (Node)

- This repo uses lockfiles for reproducible installs:
	- `backend/package-lock.json`
	- `backend/ml-process/package-lock.json`
- Before deploying, run: `npm run audit`

For clean installs on a new machine, prefer `npm ci`.

## Deploy (AWS)

See [docs/deploy.md](docs/deploy.md).

Fast path (PowerShell):

```powershell
cd backend
./scripts/deploy.ps1 -Region us-west-2 -StackName randomcatclicker-backend
```

After deploy, run the post-deploy smoke test:

```powershell
$env:API_URL="https://xxxx.execute-api.us-west-2.amazonaws.com"
$env:USER_ID_TOKEN="<cognito id token>"
$env:ADMIN_ID_TOKEN="<admin cognito id token>" # optional
npm run smoke
```
