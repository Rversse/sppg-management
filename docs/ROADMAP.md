# Product roadmap

## Phase 0 — Foundation
- [x] Create public repository and product direction
- [x] Establish Next.js + TypeScript application shell
- [x] Define architecture, guardrails, and delivery sequence
- [ ] Generate and commit npm lockfile; run local build verification

## Phase 1 — Workforce
- [x] Draft Supabase schema, workspace roles, and RLS policies
- [x] Add volunteer and attendance route shells
- [x] Draft append-only workforce audit history
- [x] Connect a dedicated Supabase project and apply reviewed schema migrations
- [x] Add passwordless auth and secure first-workspace owner bootstrap
- [x] Implement volunteer CRUD, search, filters, and section management
- [x] Implement daily attendance input and status upsert
- [ ] Implement attendance history, correction review, and export
- [x] Review RLS role boundaries and run Supabase security/performance advisors

## Phase 2 — Payroll
- [x] Add deterministic payroll calculation core and initial unit tests
- [ ] Add versioned pay rules and attendance mapping
- [x] Add live attendance-based budget simulation and per-person breakdown
- [ ] Add review, approval, lock, and correction workflow

## Phase 3 — Menu and production
- [x] Draft menu bank schema and category taxonomy
- [x] Add menu bank route shell and dashboard navigation
- [x] Model ingredient and seasoning composition
- [x] Model preparation workflow and production notes
- [x] Implement menu creation, composition, seasoning, and production-step editor
- [ ] Add menu calendar and operational summaries

## Phase 4 — AI Office
- [ ] Local Ollama connection health and heartbeat
- [ ] Manager, HR, Finance, Operations, and Analyst agent roles
- [ ] Task delegation, activity timeline, and task board
- [ ] Approval gates and truthful agent presence indicators

## Phase 5 — Hardening
- [x] Add CI workflow for lint, typecheck, tests, and production build
- [ ] Commit dependency lockfile and confirm green CI
- [ ] Confirm GitHub Actions runs successfully on the public repository
- [ ] RLS and security review
- [ ] Backup/restore and operational documentation
- [ ] Responsive and accessibility audit

## Current implementation boundary

The dedicated Supabase project has the workforce, attendance, audit, menu-bank, workspace-bootstrap, and RLS-hardening migrations applied. Passwordless auth, first-workspace onboarding, volunteer CRUD, daily attendance upsert, and menu composition/production editors are implemented on the preview branch. The preview still requires a successful Vercel build, an end-to-end sign-in test, and confirmation of the Supabase Auth redirect allow-list. Payroll approval/locking, menu scheduling, reporting, and AI Office remain out of scope for this preview. Do not treat the application as production-ready until those checks and the remaining operational modules are complete.
