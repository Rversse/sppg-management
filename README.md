# SPPG Management

A standalone operational management platform for SPPG teams. This project is separate from SIM-SPPG.

## Product direction

- Volunteer and work-section management
- Daily attendance, attendance history, and operational records
- Group-based work schedules and daily roster
- Menu bank focused on food composition and production notes
- Menu calendar and production planning
- Operational dashboard, audit trail, and workspace permissions
- Virtual Office for monitoring and delegating work to human-supervised assistant agents

This is not a payroll product. The Upah Harian field is retained as a workforce attribute and is used only to calculate the scheduled daily workforce indicator for work groups and rosters. There are no payroll runs, payslips, salary disbursement, or payroll approval workflows.

The Menu Bank is composition- and production-focused, not a food-cost calculator. It records protein sources, protein, vegetables, fruit, other ingredients, seasoning composition, preparation notes, and production steps.

## Architecture

The initial implementation is a modular monolith:

- **Web:** Next.js App Router, React, TypeScript
- **UI:** Tailwind CSS with a deliberate, information-dense professional design
- **Database/Auth/Realtime:** Supabase (PostgreSQL)
- **AI runtime:** Optional local Ollama runtime, independent from the web app
- **Deployment:** Vercel-compatible web app; local agent runtime can run independently

## Core engineering principles

1. Core operational data and calculations are deterministic and explainable.
2. AI may analyze and recommend; it must not silently change attendance, volunteer data, schedules, or finalized operational records.
3. Material changes require explicit human approval and an auditable before/after record.
4. Agent status must reflect real runtime events and heartbeats; never simulate live work as real activity.
5. Keep costs low. Local AI is the default; cloud AI is optional.
6. Protect personal data with workspace isolation, authorization checks, least privilege, and audit events.
7. Do not add payroll workflows. Keep Upah Harian as a workforce planning indicator only.

## Current modules

- Dashboard
- Volunteers and work sections
- Daily attendance
- Attendance history and CSV export
- Group schedules and daily roster
- Menu bank and production notes
- Planned: workspace roles, permissions, and Virtual Office / agent monitor
- Planned: workspace roles, permissions, and expanded audit viewer

## Local development

Requirements: Node.js LTS and npm.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never commit secrets or expose a secret/service-role key in browser code.

## Project status

Active operational-preview development. Workforce, menu, calendar, production, audit, CSV import/export, bulk attendance, and workforce/production reporting are implemented on the preview branch. Workspace role management, attendance correction review, stage-level production timing, backup/restore, final accessibility/security review, and Virtual Office remain release work. See docs/ROADMAP.md and docs/SETUP_SUPABASE.md. See `docs/ROADMAP.md` and `docs/SETUP_SUPABASE.md`.

## License

Not yet specified.
