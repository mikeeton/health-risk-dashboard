# Health Risk Dashboard 2.0 master plan

Date: 19 October 2026. Scope: existing React/FastAPI research prototype. This plan is grounded in the current repository and [gap analysis](DEVELOPMENT_GAP_ANALYSIS.md), not a claim of clinical readiness.

## Starting state and delivery sequence

The project has role-specific routes, patient-scoped API controls, PostgreSQL migrations, a retrospective PhysioNet model artifact, optional Groq and Withings integrations, CI and browser tests. Existing uncommitted work predates this programme and is preserved. The current model artifact and dissertation source are untouched.

1. **Scientific integrity:** keep the original model and label method identifiable; create and audit an observed-next-window alternative; verify raw variable names and denominators; only then retrain and compare in a new artifact directory.
2. **Shared interface foundation:** semantic light/dark tokens, restrained shell, accessible controls and reusable cards; then redesign the four role dashboards without losing workflows.
3. **Reliability:** sparse source observations with honest missingness; durable alert recovery; idempotent notification handling; test outage and retry paths.
4. **Trust boundaries:** negative patient-access tests, provider and assistant failure handling, security and dependency review.
5. **Evidence:** exact command/date/environment for tests, visual snapshots, ML method/metrics, deployment smoke and unresolved limitations.

No production deployment or real-patient data changes are in scope. The 15 November milestone is defined in [the roadmap](NOVEMBER_80_PERCENT_ROADMAP.md). The present batch addresses the data-label defect and shared design foundation; it does not complete the programme.

## Batch acceptance rule

Each batch needs a reproducible failure or documented gap, smallest coherent change, focused test, relevant build/check, and updated [implementation progress](IMPLEMENTATION_PROGRESS.md). Failed checks remain visible. Source data and model artifacts are never overwritten for a favourable metric.
