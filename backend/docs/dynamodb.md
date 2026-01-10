# DynamoDB

This backend intentionally uses **simple tables** (not a complex single-table design) so new contributors can reason about it quickly.

## Tables

### ImagesTable

Primary key:
- `PK` (string): `IMAGE#<imageId>`
- `SK` (string): `IMAGE#<imageId>` (kept for future flexibility)

Common attributes:
- `imageId`
- `ownerUserId`
- `status`
- `incomingKey`, `safeKey`, `quarantineKey`
- `contentType`, `originalFileName`, `sha256`
- `createdAt`, `updatedAt`
- `nsfw`: `{ verdict, scores }`
- `admin`: `{ decision, reason, reviewerUserId, reviewedAt }`
- `github`: `{ commitSha, path, publishedAt }`

Access patterns:
- Get by id: `PK=IMAGE#<imageId>`
- List by owner: GSI `GSI1PK=USER#<ownerUserId>`, `GSI1SK=CREATED#<createdAt>#IMAGE#<imageId>`
- List by status: GSI `GSI2PK=STATUS#<status>`, `GSI2SK=CREATED#<createdAt>#IMAGE#<imageId>`

### UsersTable

Primary key:
- `PK` (string): `USER#<userId>`
- `SK` (string): `USER#<userId>`

Attributes:
- `bannedUntil` (ISO string or epoch)
- `reason`
- `dailySubmitCount` + `dailySubmitDate`
- `minuteSubmitCount` + `minuteSubmitBucket`
- `nsfwFailCount` + `nsfwFailStreak`

The backend updates this table to block spam or repeated invalid uploads.

## Why not partition key = status?

Making `status` the partition key usually causes:
- hot partitions (everyone queries the same statuses)
- awkward per-image lookups

A better pattern is: primary key by `imageId`, plus a **GSI** for `status` listings.
