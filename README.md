# SPPG Management

A standalone operations-management platform for SPPG teams. This project is separate from SIM-SPPG.

## Product direction

- Volunteer and workforce management
- Daily attendance with bulk actions and configurable attendance policies
- Transparent payroll calculations and budget scenarios
- Menu bank and production notes (protein sources, protein, vegetables, fruit, other ingredients, seasoning composition, preparation workflow)
- Operational dashboard, audit trail, and approval controls
- Virtual Office interface for monitoring purpose-built assistant agents

## Architecture

The initial implementation is a modular monolith:

- **Web:** Next.js App Router, React, TypeScript
- **UI:** Tailwind CSS with a deliberate, information-dense professional design
- **Database/Auth/Realtime:** Supabase (PostgreSQL)
- **AI runtime:** Ollama running locally; AI is optional and never a dependency for core business calculations
- **Deployment:** Vercel-compatible web app; local agent runtime can run independently

## Core engineering principles

1. Payroll and attendance calculations are deterministic, testable, and explainable.
2. AI may analyze and recommend; it must not silently change wages, attendance, or finalized payroll.
3. Attendance statuses and their payroll treatment are configurable policy, not hard-coded assumptions.
4. Material changes and payroll finalization require an authorized human action.
5. Agent status must reflect real runtime events and heartbeats; never simulate live work as real activity.
6. Keep costs low. Local AI is the default; cloud AI is optional.
7. Protect personal and payroll data with authorization checks, least privilege, and audit events.

## Initial modules

- Dashboard
- Volunteers
- Attendance
- Payroll
- Menu bank
- Production planning
- Virtual Office / agent monitor
- Settings, roles, permissions, and audit log

## Local development

Requirements: Node.js LTS and npm.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in Supabase settings when database integration is enabled. Never commit secrets.

## Project status

Foundation phase. See `docs/ROADMAP.md` and `docs/ARCHITECTURE.md`.

## License

Not yet specified.
