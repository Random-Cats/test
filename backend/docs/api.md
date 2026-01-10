# API

Base URL is the SAM output `ApiUrl`.

All JSON responses are `application/json`.

## Auth

- User endpoints use Cognito JWT via the HTTP `Authorization: Bearer <token>` header.
- Admin endpoints require the user to be in the Cognito group `admin`.
  - The backend checks the JWT claim `cognito:groups`.

## Endpoints

### POST /images/submit (authorized)

Creates an image record and returns a presigned upload for S3.

This backend uses a **presigned POST** (not PUT) so S3 can enforce constraints like `Content-Type` and max upload size.

Request body:
```json
{
  "fileName": "mycat.webp",
  "contentType": "image/webp",
  "contentLength": 123456
}
```

Rules:
- Only `.jpg`, `.png`, `.webp` are accepted.
- Only `image/jpeg`, `image/png`, `image/webp` are accepted.
- `fileName` extension must match `contentType`.

Response:
```json
{
  "imageId": "...",
  "status": "PENDING_UPLOAD",
  "upload": {
    "url": "https://...s3.amazonaws.com/...",
    "fields": {
      "key": "incoming/<userId>/<imageId>.webp",
      "policy": "...",
      "x-amz-signature": "..."
    }
  }
}
```

#### Uploading from the browser

The presigned POST is used with `multipart/form-data`.

Example:

```js
// 1) Ask backend for upload
const init = await fetch(`${API}/images/submit`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    fileName: file.name,
    contentType: file.type,
    contentLength: file.size,
  }),
}).then(r => r.json());

// 2) Upload directly to S3
const form = new FormData();
for (const [k, v] of Object.entries(init.upload.fields)) form.append(k, v);
form.append('Content-Type', file.type);
form.append('file', file);

const uploadResp = await fetch(init.upload.url, { method: 'POST', body: form });
if (!uploadResp.ok) throw new Error('S3 upload failed');

// 3) Poll status
const status = await fetch(`${API}/images/${init.imageId}`, {
  headers: { Authorization: `Bearer ${idToken}` },
}).then(r => r.json());
```

### GET /images/{imageId} (authorized)

Returns the image record (must belong to caller unless caller is admin).

### GET /images/mine (authorized)

Lists the caller's submissions.

### GET /admin/images?status=READY_FOR_REVIEW (admin)

Lists images filtered as safe and awaiting review.

### POST /admin/images/{imageId}/decision (admin)

Request:
```json
{ "decision": "APPROVE", "reason": "looks fine" }
```

### POST /admin/commit (admin)

Publishes approved images to GitHub.

Request:
```json
{ "limit": 25, "deleteFromS3": true }
```

Response:
```json
{ "commitSha": "...", "published": 12 }
```

### POST /metrics/event (public)

Lightweight metrics endpoint used for dashboards.

Request:
```json
{ "event": "click" }
```

Allowed events: `pageview`, `click`, `submit`.
