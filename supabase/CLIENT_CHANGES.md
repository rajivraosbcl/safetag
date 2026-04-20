# Signup fix — summary of applied changes

## The bug

The signup page showed:

> insert or update on table "users" violates foreign key constraint "users_id_fkey"

plus a cascade of 401 and 409 errors from `/rest/v1/users`.

## Root cause

`app/signup/page.tsx` was calling `supabase.auth.signUp()` from the **browser**
and using `authData.user.id` to populate the `public.users` row. Supabase has a
documented security behavior: **when "Confirm email" is ON and the email is
already registered, `auth.signUp` returns a success response with a fake,
random `user.id` that does not exist in `auth.users`**. That fake id triggered
the foreign-key violation. The 401s/409s were supabase-js retrying the insert.

## Files changed

### `app/api/auth/signup/route.ts` (rewritten)

- Now uses `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
  server-side. Admin API always returns the real id and fails cleanly on
  duplicate emails.
- Uses `.upsert(..., { onConflict: 'id' })` instead of `.insert()` so it plays
  nicely with the DB trigger (see SQL below) and with retries.
- Rolls back the auth user if the profile upsert fails, so users can retry.
- Returns the real `userId` to the client.
- Friendly 409 on duplicate email.

### `app/signup/page.tsx` (handleSignup rewritten)

- No longer calls `supabase.auth.signUp` from the browser.
- Posts all fields straight to `/api/auth/signup`; the server creates the
  auth user + profile in one go and returns the real `userId`.
- Then calls `supabase.auth.signInWithPassword` on the client so the session
  is established and the RC-file upload has a valid JWT.
- Uploads the RC file AFTER sign-in, then `.update()`s the `rc_file_path`
  column on the user's row.

## One thing YOU still need to do

### 1. Run the SQL (`supabase/fix_users_fkey.sql`)

Open Supabase Dashboard → **SQL Editor → New query**, paste the contents of
`supabase/fix_users_fkey.sql`, and run it. It is idempotent. This installs:

- the `users_id_fkey` FK with `ON DELETE CASCADE`,
- a trigger `on_auth_user_created` that auto-creates a stub row in
  `public.users` whenever a user is created in `auth.users` (defense in
  depth — the `.upsert` in the API route handles the collision),
- clean RLS policies (`select_own`, `insert_own`, `update_own`).

### 2. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel

Vercel dashboard → your project → **Settings → Environment Variables**.

Add `SUPABASE_SERVICE_ROLE_KEY` with the service role key from Supabase
Dashboard → **Project Settings → API → service_role secret**. This key is
**server-side only** — do not put it in `NEXT_PUBLIC_*` or commit it.

After setting it, redeploy.

### 3. Optional — turn off "Confirm email"

Dashboard → **Authentication → Providers → Email** → "Confirm email" OFF
for easier dev testing. Not required now that the server uses
`email_confirm: true` via the admin API, but it keeps things simple.

## How to verify

On a fresh signup attempt, the DevTools Network tab should show only:

- `POST /api/auth/signup` → `200` with `{ success: true, userId: "..." }`
- `POST /auth/v1/token?grant_type=password` → `200` (the client sign-in)
- `POST /storage/v1/object/rc-documents/...` → `200` (if RC uploaded)
- `POST /api/create-order` → `200`
- Razorpay checkout opens

No more 401, no more 409, no more `users_id_fkey`.
