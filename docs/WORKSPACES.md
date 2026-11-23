# Vitala workspaces

This is a visual map of the screens a user sees and the records each area uses. Route access in the browser improves navigation; **the FastAPI service enforces patient and role access**. Screenshots in the dissertation are dated research captures. The diagrams below describe the current route structure without presenting synthetic demonstration values as clinical results.

## Doctor: clinical review

The doctor workspace starts with assigned patients and moves toward evidence and a recorded action. The main screen is `/doctor`; `/analytics`, `/review-cases`, `/reports` and `/referrals` support deeper review.

```mermaid
flowchart LR
  A[Assigned patients] --> B[Current observations and trends]
  B --> C{Needs attention?}
  C -->|Yes| D[Review case or referral]
  C -->|No| E[Continue monitoring]
  D --> F[Recorded clinical workflow]
```

## Nurse: care workflow

The nurse's `/nurse` and `/care` screens organise observation, medication and task activity around the selected assigned patient. Review cases and notifications expose escalation state.

```mermaid
flowchart LR
  A[Assigned worklist] --> B[Observation or care task]
  B --> C[Record completion]
  B --> D[Escalate concern]
  C --> E[(Persisted care record)]
  D --> F[Review case and alert]
```

## Patient: personal overview

`/patient` explains the patient's own measurements. `/devices` shows connection and synchronisation state; `/care` and `/account` expose relevant care and security tasks. Missing data and source labels remain visible.

```mermaid
flowchart LR
  A[Own account] --> B[Measurements and trends]
  B --> C[Source and freshness]
  C --> D[Connected devices]
  C --> E[Care information]
```

## Administrator: operations

`/admin` links to `/admin/users`, `/admin/approvals`, `/admin/assignments`, `/admin/operations`, `/admin/research` and `/audit-logs`. Administrative access does not imply routine access to patient charts.

```mermaid
flowchart LR
  A[Approval and account controls] --> B[Roles and assignments]
  B --> C[Operational health]
  C --> D[Audit and research governance]
```

## Model intelligence

`/analytics` gives doctors retrospective model evidence; `/admin/research` contains restricted research and governance records. The installed forward-filled proxy model is distinct from the newer observed HR/BP candidate, which failed its inference gate.

```mermaid
flowchart LR
  A[Prepared research cohort] --> B[Patient-grouped evaluation]
  B --> C[Versioned artifact and metrics]
  C --> D{Acceptance gate}
  D -->|Pass| E[Governed research inference]
  D -->|Fail| F[Blocked candidate]
  E --> G[Shadow outcomes and drift review]
```

The [model card](ML_MODEL_CARD.md) defines the two outcomes and their limitations. The [reproducible graph script](../scripts/build_repository_graphs.py) scores the installed artifact without retraining it.

## AI assistant

`/ai-assistant` offers patient-scoped summaries with timestamps, references, missing-data disclosures and generation status. An external provider is optional; its output is checked but still requires human review.

```mermaid
flowchart LR
  A[Authorised patient context] --> B[Bounded evidence]
  B --> C[Optional generation]
  C --> D[Schema and reference checks]
  D --> E[Labelled answer or safe fallback]
```

## Devices and observations

`/devices` shows linked devices and sync outcomes. Manual, simulated, uploaded and provider-originated measurements keep distinct provenance. A webhook is a retrieval hint; the backend fetches provider measurements before ingestion.

```mermaid
flowchart LR
  A[Device or authorised input] --> B[Validate values and provenance]
  B --> C[Deduplicate external identity]
  C --> D[(PostgreSQL observation)]
  D --> E[Risk assessment]
```

## Alerts and notifications

`/notifications` displays retained inbox state for all roles; `/review-cases` provides clinician review. PostgreSQL is authoritative. WebSockets and optional Redis make changes visible sooner, while reconnect and polling recover the view.

```mermaid
flowchart LR
  A[Stored clinical event] --> B[(Notification state)]
  B --> C[Inbox and acknowledgement]
  B -. update hint .-> D[WebSocket or Redis]
  D -. refresh .-> C
  C --> E[Review or escalation]
```

## Supporting pages

| Task | Frontend route | Starting point |
| --- | --- | --- |
| Sign in, access request, password reset | `/login`, `/register`, `/reset-password` | [Frontend guide](../frontend/README.md) |
| Upload observations | `/upload` | [Ingestion contract](architecture/MEASUREMENT_INGESTION.md) |
| Reports and referrals | `/reports`, `/referrals` | [Role workflows](architecture/ROLE_WORKFLOWS.md) |
| Account security | `/account` | [Security overview](SECURITY.md) |
| Testing and accessibility | Browser and API checks | [Testing guide](TESTING.md) |

## Verified visual captures

These 360-pixel Chromium captures used synthetic fixtures on 10 November 2026. They show layout behaviour, not live provider delivery or a physical-phone test.

| Sign-in validation | Patient overview | Clinical alerts |
| --- | --- | --- |
| ![Mobile sign-in validation](evidence/local-demo-2026-11-10/sign-in-validation-chromium-360.png) | ![Mobile patient overview](evidence/local-demo-2026-11-10/patient-overview-chromium-360.png) | ![Mobile clinical alerts](evidence/local-demo-2026-11-10/clinical-alerts-chromium-360.png) |
