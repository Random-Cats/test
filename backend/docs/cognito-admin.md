# Cognito: users vs admins (single user pool)

This backend uses **one Cognito User Pool**.

- Normal users: any authenticated user
- Admins: users in the Cognito group named `admin`

## Create an admin user (console)

1. AWS Console → Cognito → User pools → your pool (`randomcatclicker-users`)
2. Users → Create user
3. Give the user an email and temporary password
4. Groups → create group `admin` (this SAM template creates it automatically)
5. Add the user to the `admin` group

## Verify admin claim

When the admin logs in, their JWT will include a claim like:

- `cognito:groups`: `["admin"]`

The backend checks this claim for admin endpoints.

## Local/dev notes

- This repo does not include the frontend auth integration yet.
- Any frontend can authenticate against Cognito and attach `Authorization: Bearer <idToken>` to API calls.
