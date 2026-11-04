# Supabase setup

The repository contains a migration for workforce and attendance. It has **not** been applied to any Supabase project.

## Select the correct project first

Use a dedicated Supabase project named for SPPG Management. Do not reuse an unrelated existing project. Before applying the migration, confirm the project reference and that it contains no production data that could be affected.

## Configure application environment

Set these in local `.env.local` and deployment environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use a publishable key in the browser. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable or commit it to Git.

## Apply schema

Review and apply `supabase/migrations/202611040001_workforce_attendance.sql` to the dedicated project only after confirming the project reference.

The migration creates workspaces, memberships, sections, volunteers, and attendance records with RLS enabled. Membership provisioning is intentionally not exposed to normal authenticated users.

## Bootstrap the first owner

After creating the first user through Supabase Auth, an administrator must create the initial workspace and membership using the authenticated user's UUID in the Supabase SQL editor. Keep this operation restricted to a trusted project administrator. Do not expose workspace membership insertion to the public client.

## Verify

After migration:
1. Inspect tables and foreign keys.
2. Run Supabase security and performance advisors.
3. Confirm an unaffiliated authenticated user cannot read workspace data.
4. Confirm an HR member can manage volunteers and attendance but cannot manage workspace membership.
5. Confirm a viewer can read but cannot mutate workforce data.
6. Configure Auth redirect URLs before enabling sign-in in the app.
