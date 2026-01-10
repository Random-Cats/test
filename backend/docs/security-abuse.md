# Security & abuse protections

## Authentication

- All user and admin actions use **Cognito JWT auth**.
- Admin authorization is enforced by checking the `cognito:groups` claim for `admin`.

## Upload validation

Enforced twice:
1. At `POST /images/submit`:
   - extension must be `.jpg/.png/.webp`
   - contentType must be `image/jpeg|image/png|image/webp`
   - extension must match contentType
2. At S3 processing time:
   - validate **magic bytes** to confirm actual file type

## Anti-spam controls

At `POST /images/submit`:
- block if `bannedUntil > now`
- enforce submissions per minute and per day (configurable)

At processing time:
- if an upload is invalid type or NSFW, increment failure counters
- repeated failures can auto-ban for a cooling-off window

## API Gateway protections

- Set conservative throttles at the API stage (per-account)
- Keep CORS strict in production (only your site origin)

You can optionally add AWS WAF later; it is not required for v1.
