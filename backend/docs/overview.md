# Overview

## Architecture (high level)

- **Cognito User Pool**: sign-in for users and admins.
  - Admins are members of the `admin` Cognito group.
- **API Gateway (HTTP API)** exposes endpoints.
- **S3 Bucket** stores uploaded images.
  - `incoming/` – user uploads land here
  - `safe/` – images that pass the automated filter
  - `quarantine/` – invalid type or NSFW images
- **DynamoDB** stores image status, metadata, reviewer decisions, and abuse counters.
- **Lambda**:
  - API handlers (submit/init, list, admin review, commit)
  - S3 event handler (validate + filter)
  - Metrics handler (writes CloudWatch metrics)
- **CloudWatch + Amazon Managed Grafana** for dashboards.

## Core flow

1. User logs in (Cognito)
2. User calls `POST /images/submit` (authorized)
3. Backend returns a presigned upload and `imageId`
4. User uploads to S3 `incoming/...`
5. S3 event triggers processing Lambda (container image):
   - validates file type (magic bytes)
  - runs NSFW classification (nsfwjs + tfjs-node)
   - moves to `safe/` or `quarantine/`
   - updates DynamoDB status
6. Admin reviews safe images and approves/rejects
7. Admin calls `POST /admin/commit` to publish approved images to GitHub

## Status model

An image record moves through:

- `PENDING_UPLOAD`
- `PROCESSING`
- `REJECTED_INVALID_TYPE`
- `REJECTED_NSFw`
- `READY_FOR_REVIEW`
- `APPROVED`
- `REJECTED_BY_ADMIN`
- `PUBLISHED`
