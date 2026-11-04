# Product roadmap

## Phase 0 — Foundation
- [x] Create private repository and product direction
- [x] Establish Next.js + TypeScript application shell
- [x] Define architecture, guardrails, and delivery sequence
- [ ] Generate and commit npm lockfile; run local build verification

## Phase 1 — Workforce
- [x] Draft Supabase schema, workspace roles, and RLS policies
- [x] Add volunteer and attendance route shells
- [x] Draft append-only workforce audit history
- [ ] Connect a dedicated Supabase project and provision the first workspace owner
- [ ] Implement volunteer CRUD, search, filters, and section management
- [ ] Implement daily attendance input, bulk selection, and status updates
- [ ] Implement attendance history, correction review, and export
- [ ] Verify role permissions and RLS behavior against a real project

## Phase 2 — Payroll
- [x] Add deterministic payroll calculation core and initial unit tests
- [ ] Add versioned pay rules and attendance mapping
- [ ] Add budget simulation and per-person breakdown
- [ ] Add review, approval, lock, and correction workflow

## Phase 3 — Menu and production
- [ ] Menu bank and category taxonomy
- [ ] Ingredient and seasoning composition
- [ ] Preparation workflow and production notes
- [ ] Menu calendar and operational summaries

## Phase 4 — AI Office
- [ ] Local Ollama connection health and heartbeat
- [ ] Manager, HR, Finance, Operations, and Analyst agent roles
- [ ] Task delegation, activity timeline, and task board
- [ ] Approval gates and truthful agent presence indicators

## Phase 5 — Hardening
- [x] Add initial CI workflow for typecheck, tests, and production build
- [ ] Commit dependency lockfile and confirm green CI
- [ ] RLS and security review
- [ ] Backup/restore and operational documentation
- [ ] Responsive and accessibility audit

## Current implementation boundary

The workforce pages are honest UI shells, not yet connected to live data. The SQL migrations are committed but have not been applied to any Supabase project. Do not treat the application as production-ready until database provisioning, auth, RLS tests, and CI verification are complete.
