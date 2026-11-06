# Supabase setup and verification

The dedicated project is `sppg-management` (reference: `sjmjgfndvjubicypaeri`, region: Singapore). The following migrations have been applied to that project:

1. `202611040001_workforce_attendance.sql`
2. `202611040002_workforce_audit.sql`
3. `202611040003_menu_bank.sql`
4. `202611040004_workspace_owner_bootstrap.sql`
5. `202611040005_rls_policy_and_fk_index_hardening.sql`
6. `202611040006_limit_initial_workspace_bootstrap_per_user.sql`
7. `202611040008_volunteer_groups_and_weekday_schedules.sql`
8. `202611040009_attendance_weekdays_only.sql`
9. `202611040010_bind_volunteer_groups_to_work_sections.sql`
10. `202611040011_volunteer_schedule_audit_trail.sql`
11. `202611040012_volunteer_schedule_versions.sql`
12. `202611040013_preserve_deleted_schedule_versions.sql`
13. `202611040014_volunteer_profile_schedule_versions.sql`
14. `202611040015_index_volunteer_schedule_audit_actor.sql`
15. `202611040016_serialize_workspace_bootstrap_per_user.sql`
16. `202611040017_menu_calendar_planning.sql`
17. `202611040018_production_batches_and_bottleneck_history.sql`
18. `202611040019_production_batch_history_hardening.sql`
19. `202611040020_enforce_production_batch_portion_limits.sql`
20. `202611040021_production_rls_policy_and_fk_index_cleanup.sql`

Migration `202611040007` was intentionally skipped. Apply migrations in numeric order; do not reapply migrations already recorded in Supabase migration history.

The following production-integrity and timezone migrations were added after the baseline list above. They are present in this branch but have **not** been applied to the connected Supabase project as part of this work:

21. `202611060001_enforce_production_completion_in_database.sql`
22. `202611060002_protect_completed_production_plans.sql`
23. `202611060003_protect_completed_menu_plan_records.sql`
24. `202611060004_prevent_batches_on_completed_plans.sql`
25. `202611060005_workspace_timezone_schedule_versions.sql`
26. `202611060006_preserve_attendance_original_recorder.sql`

Review these migrations and confirm the target project's migration history before applying them. Do not mark them as applied or run them against the project until the release/migration review is complete.

Do not reuse this setup against unrelated Supabase projects.

## Application environment

Set these in local `.env.local` and Vercel Production, Preview, and Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use a publishable key in the browser. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable or commit it to Git.

## Auth redirect configuration

In Supabase Dashboard → Authentication → URL Configuration:

- Keep the production Site URL set to the production domain once the production domain is finalized.
- Add the current Vercel branch preview callback to Additional Redirect URLs:
  `https://sppg-management-git-feat-operational-preview-rversse-s-projects.vercel.app/auth/callback`
- When preview branch URLs change, update this allow-list entry accordingly.

The app uses passwordless email OTP. The first sign-in creates an Auth user if signups are enabled. The user then creates the first workspace; the database RPC atomically creates the workspace and assigns that authenticated user the `owner` role.

For production email delivery, configure a trusted custom SMTP provider and appropriate rate limits. Do not treat the default test mailer as a production mail service.

## Security model

- All application tables in `public` have RLS enabled.
- `anon` has no SELECT access to application tables.
- Workspace membership rows cannot be inserted, updated, or deleted directly by client roles.
- `create_workspace_for_current_user(text)` is a narrowly scoped SECURITY DEFINER RPC. It requires `auth.uid()`, validates the workspace name, creates the workspace and owner membership atomically, and is executable only by `authenticated`.
- The Supabase auto-RLS event-trigger function is not executable through the Data API by `anon` or `authenticated`.
- Volunteer and attendance mutations are restricted to owner/admin/HR. Section management also allows operations. Menu management is restricted to owner/admin/operations.
- Audit records are read-only to client roles and written by database triggers.

## Verification performed

- The baseline migration history was checked previously; re-verify the connected project migration table before applying any pending migration listed above.
- A previous security review found the auto-RLS trigger unavailable to `anon` and `authenticated`; re-run the Security Advisor after the pending hardening migrations are applied.
- RLS was previously confirmed on workspaces, memberships, sections, volunteers, attendance, audit, menu tables, menu plans, production batches, and batch-event history.
- `anon` was previously confirmed to have no SELECT privilege on application tables.
- Performance Advisor reported unused indexes on a newly provisioned, nearly empty database; reassess after realistic data volume and query patterns exist.

## First-run checklist

1. Open the Vercel preview and request a sign-in link using an email address you can access.
2. Open the email link in the same browser session.
3. Create the initial workspace. The signed-in account becomes owner.
4. Add work sections and volunteers.
5. Record attendance for a selected date, then reload and verify the saved statuses.
6. Add a menu, ingredients, seasonings, and production steps.
7. Verify a second workspace/user cannot read the first workspace's records.

Do not seed sample operational records in the production database. Use clearly identified test data only in a dedicated test workspace.
