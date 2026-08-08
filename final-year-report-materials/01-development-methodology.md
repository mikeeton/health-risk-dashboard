# Development Methodology

## Recommended classification

The project is best described as using an **iterative and incremental
Agile-style software development methodology**. It should not be described as
formal Scrum unless there is separate evidence of time-boxed sprints, a product
backlog, sprint planning, daily Scrum meetings, sprint reviews,
retrospectives, and defined Scrum roles.

It is also inaccurate to call the work purely Waterfall. The repository shows
that features, security controls, user-interface refinements, testing, and
deployment support were added and corrected across multiple iterations rather
than completed once in a strict sequence.

## Report-ready methodology section

An iterative and incremental Agile-style methodology was adopted for the
development of the Health Risk Dashboard. This approach divided the system
into manageable functional areas that could be designed, implemented, tested,
and refined progressively. The early work established the application
structure, database-backed patient records, and user roles. Later iterations
expanded the system with clinician actions, staff-to-patient assignments,
wearable and live-vital support, administrative workflows, referrals,
notifications, security controls, automated tests, deployment configuration,
and responsive interface improvements.

Each iteration followed a recurring cycle of requirements review, design,
implementation, testing, and refinement. For example, the initial access model
was strengthened by adding explicit staff assignments and safer administrative
boundaries. Referral functionality was subsequently extended with approval and
record-sharing controls. Later iterations addressed rate limiting, request
metrics, automated security testing, loading performance, deployment
readiness, password usability, responsive layouts, and theme behaviour. This
progressive process allowed faults and design limitations to be identified and
corrected without postponing all evaluation until the end of development.

The methodology was suitable because the project contains several interacting
subsystems, including authentication, role-based authorisation, patient
monitoring, analytics, AI-assisted summaries, referrals, notifications, and
administrative functions. Implementing these capabilities incrementally made
it possible to validate their integration as the application grew. Source
control commits preserved the history of the increments, while backend
security tests and frontend end-to-end tests provided repeatable checks for
important behaviours.

Although the approach shares Agile principles, the available project evidence
does not establish full use of the Scrum framework. The report therefore uses
the term “iterative and incremental Agile-style development” rather than
claiming formal Scrum practice. This distinction keeps the methodology
accurate and defensible.

## Development stages

1. **Requirements and scope definition** — identify the users (administrator,
   doctor, nurse, and patient), access boundaries, clinical-monitoring needs,
   and expected system features.
2. **Architecture and data design** — select the React/FastAPI/PostgreSQL
   architecture and define relational models and API boundaries.
3. **Core implementation** — implement authentication, patient records,
   vitals, medications, dashboards, and database access.
4. **Workflow expansion** — add staff assignments, registration approval,
   referrals, review cases, alerts, notifications, and role-specific actions.
5. **Analytics and intelligent support** — add risk calculations, trend
   analysis, machine-learning endpoints, and AI-assisted summaries.
6. **Security and quality improvement** — strengthen backend authorisation,
   rate limiting, auditability, validation, and automated testing.
7. **Interface refinement** — improve responsive layouts, accessibility,
   password controls, loading performance, and light/dark themes.
8. **Deployment and release preparation** — add migrations, health checks,
   deployment configuration, environment guidance, and operational
   documentation.

These stages overlapped and were revisited as defects and new requirements were
identified; they were not a single-pass Waterfall sequence.

## Repository evidence

| Evidence | What it supports |
|---|---|
| Git commit history | Features and refinements were delivered in multiple increments. |
| `DEVELOPMENT_ISSUES_AND_FIXES.md` | Problems were identified, corrected, and documented throughout development. |
| `backend/alembic/versions/` | The relational schema evolved through versioned migrations. |
| `backend/tests/test_security.py` | Security behaviour received repeatable automated testing. |
| `frontend/tests/e2e/smoke.spec.ts` | Public workflows, responsiveness, authentication feedback, and protected navigation were tested. |
| `README.md` and `DEPLOYMENT.md` | Setup, architecture, security, deployment, and known production gaps were progressively documented. |

## What to say during the viva

“I used an iterative and incremental Agile-style approach. I developed the
system in functional increments and repeatedly tested and refined the
integration. I do not claim formal Scrum because I do not have sufficient
evidence of all Scrum roles and ceremonies.”

## Evidence still to add personally

Add any genuine evidence you possess, such as dated supervisor meetings,
weekly task lists, requirements notes, prototype feedback, a Trello/Jira board,
or testing records. Do not invent sprints or stakeholder interviews that did
not occur.

