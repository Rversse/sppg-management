# Product roadmap

## Product goal

Build SPPG Management as a standalone operational platform for an SPPG team. It is separate from SIM-SPPG. The product should connect workforce, attendance, menu composition, production planning, daily operations, and eventually a truthful Virtual Office for human-supervised agents.

The application is not a payroll system. Do not add payroll runs, payslips, salary disbursement, or payroll approval workflows. Keep Gaji Harian only as a workforce attribute and use it for the scheduled daily workforce indicator in group planning and rosters. The Menu Bank remains composition- and production-focused, not a food-cost calculator.

## Phase 0 — Foundation
- [x] Create public repository and product direction
- [x] Establish Next.js + TypeScript application shell
- [x] Define architecture, guardrails, and delivery sequence
- [x] Connect dedicated Supabase project and passwordless authentication
- [x] Secure first-workspace owner bootstrap
- [ ] Generate and commit npm lockfile; confirm green CI

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
- [ ] Attendance correction reason, review trail, and export refinements
- [ ] Volunteer import/export (CSV/Excel)
- [ ] Bulk attendance actions (select all and per-section actions)
- [ ] Workspace member invitations, roles, and permission management

## Phase 2 — Menu and production operations
- [x] Menu bank catalog and status lifecycle
- [x] Ingredient composition categories (protein source, protein, vegetable, fruit, other)
- [x] Seasoning composition
- [x] Ordered production steps, durations, instructions, critical notes
- [x] Menu calendar / daily menu planning
- [ ] Production board with preparation status, batch tracking, and bottlenecks
- [ ] Operational summaries by date and menu
- [ ] Menu duplication/versioning for recurring recipes

## Phase 3 — Virtual Office
- [ ] Define agent runtime boundary and local Ollama connection
- [ ] Runtime health check, heartbeat, and real presence state
- [ ] Manager, HR, Operations, and Analyst agent roles
- [ ] Task board, delegation, ownership, and activity timeline
- [ ] Agent outputs grounded in workspace data with source references
- [ ] Human approval gates for consequential changes
- [ ] Never simulate agent activity; offline and error states must be explicit

## Phase 4 — Reporting and operational hardening
- [ ] Dashboard trends and date-based operational reports
- [ ] CSV/Excel export coverage across core modules
- [ ] Audit log viewer and permission review
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
7. Do not reintroduce payroll features. Gaji Harian is only used as a workforce planning indicator.
8. Preserve the product's operational focus: menu composition and production notes, not food costing.

## Current implementation boundary

The dedicated Supabase project has workforce, attendance, audit, menu-bank, workspace-bootstrap, volunteer-group, schedule-snapshot, and RLS-hardening migrations applied. The preview has passwordless auth, first-workspace onboarding, volunteer CRUD, daily attendance, menu composition/seasoning/production editors, recurring group schedules, effective-dated roster snapshots, and a daily roster. Attendance history and CSV export, plus date-based menu planning with a weekly calendar and production status lifecycle, have now been added to the preview branch.

The current release is still an operational foundation, not the finished product. Menu scheduling, production board, bulk/import workflows, workspace role management, and Virtual Office remain to be built. Do not merge to main or describe the platform as production-ready solely because the initial manual flows work.
