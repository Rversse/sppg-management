# Product roadmap

## Product goal

Build SPPG Management as a standalone operational platform for an SPPG team. It is separate from SIM-SPPG. The product should connect workforce, attendance, menu composition, production planning, daily operations, and eventually a truthful Virtual Office for human-supervised agents.

The application is not a payroll system. Do not add payroll runs, payslips, salary disbursement, or payroll approval workflows. Keep Upah Harian only as a workforce attribute and use it for the scheduled daily workforce indicator in group planning and rosters. The Menu Bank remains composition- and production-focused, not a food-cost calculator.

## Phase 0 — Foundation
- [x] Create public repository and product direction
- [x] Establish Next.js + TypeScript application shell
- [x] Define architecture, guardrails, and delivery sequence
- [x] Connect dedicated Supabase project and passwordless authentication
- [x] Secure first-workspace owner bootstrap
- [x] Generate and commit npm lockfile; confirm green CI

## Phase 1 — Workforce operations
- [x] Volunteer and work-section management
- [x] Search and section filtering
- [x] Daily attendance entry and status upsert
- [x] Weekday-only attendance policy (Monday-Friday)
- [x] Group-based recurring work schedules
- [x] Section-bound volunteer assignment and one active group per volunteer
- [x] Scheduled daily wage indicator
- [x] Daily roster from effective-dated schedule snapshots
- [x] Distinguish scheduled roster from actual attendance, including attendance outside roster
- [x] Append-only group and schedule audit history
- [x] Attendance history with date range, section/status filters, and CSV export
- [ ] Attendance correction reason and review trail
- [x] Volunteer CSV import/export with validation, duplicate detection, and preview
- [x] Bulk attendance actions (select all and per-section actions)
- [ ] Workspace member invitations, roles, and permission management

## Phase 2 — Menu and production operations
- [x] Menu bank catalog and status lifecycle
- [x] Ingredient composition categories (protein source, protein, vegetable, fruit, other)
- [x] Seasoning composition
- [x] Ordered production steps, durations, instructions, critical notes
- [x] Menu calendar / daily menu planning
- [x] Production board with preparation status and recipe instructions
- [x] Production batch splitting with planned-portion guardrails
- [x] Batch assignment to active volunteers
- [x] Blocked-batch reason capture and append-only batch change history
- [x] Batch duration analytics and blocker-reason summaries from the append-only batch audit
- [x] Date-range operational summaries by menu with CSV export
- [x] Indicative menu-duration estimate versus actual batch-duration comparison
- [x] Stage-level actual duration capture (explicit per-stage start/finish events with recipe-step snapshots)
- [x] Menu duplication/versioning for recurring recipes (atomic clone of composition, seasonings, and production steps; immutable superseded versions)

## Phase 3 — Virtual Office
- [ ] Define agent runtime boundary and local Ollama connection
- [ ] Runtime health check, heartbeat, and real presence state
- [ ] Manager, HR, Operations, and Analyst agent roles
- [ ] Task board, delegation, ownership, and activity timeline
- [ ] Agent outputs grounded in workspace data with source references
- [ ] Human approval gates for consequential changes
- [ ] Never simulate agent activity; offline and error states must be explicit

## Phase 4 — Reporting and operational hardening
- [x] Date-based operational reports for production and workforce
- [x] CSV export for attendance history, volunteer data, production operations, and workforce reports
- [x] Audit log viewer for workforce and schedule history; [ ] workspace role management
- [ ] Backup/restore and operational documentation
- [ ] Responsive and accessibility audit
- [ ] RLS and security review
- [ ] Confirm GitHub Actions and deployment checks are green

## Engineering constraints

1. Core business data and calculations remain deterministic; AI is optional.
2. AI may analyze and recommend. It must not silently modify attendance, volunteer profiles, schedules, or menu records.
3. Any consequential AI action requires explicit human approval and an auditable before/after record.
4. Agent presence must come from real runtime heartbeats/events, never fabricated UI animation.
5. Keep operating costs low. Prefer local Ollama for the agent runtime; cloud AI is optional, not required for core operations.
6. Enforce workspace isolation, least privilege, and server/database authorization.
7. Do not reintroduce payroll features. Upah Harian is only used as a workforce planning indicator.
8. Preserve the product's operational focus: menu composition and production notes, not food costing.

## Current implementation boundary

The dedicated Supabase project has workforce, attendance, audit, menu-bank, workspace-bootstrap, volunteer-group, schedule-snapshot, and RLS-hardening migrations applied. The preview has passwordless auth, first-workspace onboarding, volunteer CRUD, daily attendance, menu composition/seasoning/production editors, recurring group schedules, effective-dated roster snapshots, and a daily roster. Attendance history and CSV export, plus date-based menu planning with a weekly calendar and production status lifecycle, plus a production board that reads menu plans and displays recipe components, seasonings, production instructions, batch splitting, volunteer assignment, and blocked-reason tracking with audit history, have now been added to the preview branch.

The preview now includes workforce management, attendance, schedules, daily roster, volunteer CSV import/export, bulk attendance, audit trail, menu bank, menu calendar, production board with batch controls, production analytics, and date-based workforce reports. Remaining release work includes attendance correction review, workspace member invitations and role management, stage-level production timing, menu duplication/versioning, backup/restore, accessibility and security review, and full Virtual Office runtime. Do not merge to main or describe the platform as production-ready until those release gates are completed. Do not merge to main or describe the platform as production-ready solely because the initial manual flows work.
