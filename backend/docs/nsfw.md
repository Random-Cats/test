# NSFW filtering (nsfwjs)

## Why this is a container-image Lambda

The NSFW step uses:

- `nsfwjs` (TensorFlow model)
- `@tensorflow/tfjs-node` (native bindings)
- `sharp` (decode jpg/png/webp to raw pixels)

Those dependencies are easiest to deploy correctly by building them in a Linux container.
That’s why the S3 processing Lambda is implemented in [backend/ml-process/app.js](../ml-process/app.js).

## Policy

The processor computes nsfwjs class scores and applies this simple rule:

- If `Pornography >= 0.8` OR `Hentai >= 0.8` → `REJECTED_NSFw`
- Else → `READY_FOR_REVIEW`

All images that pass automation still require **admin approval** before being published.

## File type constraints

We allow only:

- `.jpg`, `.png`, `.webp` (checked at submit-init)
- JPEG/PNG/WebP magic bytes (checked after upload)

If type validation fails, the object is moved to `quarantine/` and status becomes `REJECTED_INVALID_TYPE`.
