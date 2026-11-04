# Architecture

## Deployment boundaries

The application is a standalone product and does not depend on SIM-SPPG. The web interface and Supabase project are hosted separately from the optional local AI runtime.

## Application layers

- Presentation: Next.js pages and UI components.
- Domain: typed business rules for attendance, payroll, menu composition, and production.
- Data access: server-side Supabase client and narrowly scoped queries.
- Agent runtime: local Ollama plus an orchestrator that emits signed/validated activity events.
- Audit: append-only records for consequential changes.

## Domain invariants

### Attendance
Use explicit statuses: present, permission, sick, absent. Store date, volunteer, status, optional clock-in/out, notes, actor, and timestamps. Bulk updates must be reviewable and auditable. Payroll treatment is policy-driven and versioned.

### Payroll
Separate input facts, policy configuration, calculation result, and approval. Calculation output must include a breakdown and policy version. A finalized payroll run is immutable; corrections create a new revision with a reason. Never allow an AI response to directly write or finalize payroll.

### Menu and production
Represent menu components (protein source, protein, vegetables, fruit, other ingredients), seasoning composition, quantities/units, preparation stages, and production notes. Avoid centering this module on food cost; composition and operational production constraints are primary.

### AI agents
Agent presence must be derived from heartbeat and runtime events. Distinguish offline, idle, working, thinking, awaiting approval, completed, error, and interrupted. Missing heartbeat must not be displayed as successful completion. AI actions that modify sensitive data require explicit user approval.

## Security

- Keep service-role keys server-side only.
- Enable Row Level Security for user-facing tables.
- Validate inputs at the server boundary.
- Enforce role/permission checks on every mutation.
- Do not log secrets or unnecessary personal data.
