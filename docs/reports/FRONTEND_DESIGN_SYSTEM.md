# Clinical interface design foundation

Date: 19 October 2026. Scope: shared visual rules implemented initially in `frontend/src/styles/index.css`; role-specific adoption is underway. The design should support calm reading of measured data before experimental output.

## Tokens and patterns

| Purpose | Light | Dark | CSS token |
|---|---|---|---|
| Page | `#f8fafc` | `#080f1e` | `--page-bg` |
| Main text | `#0f172a` | `#f1f5f9` | `--page-text` |
| Surface | `#ffffff` | translucent dark slate | `--panel-bg` |
| Quiet surface | `#f1f5f9` | `#111d31` | `--surface-subtle` |
| Active navigation | `#eff6ff` | `#172b48` | `--surface-hover` |
| Brand | `#2563eb` | `#60a5fa` | `--brand` |
| Border | `#e2e8f0` | low-contrast slate | `--panel-border` |

Typography: Inter/system sans; headings use a compact weight and spacing hierarchy; numeric observations use tabular figures and always show units. Use 8 px spacing increments, roughly 14 px card corners and a 44 px minimum icon-button target. Surfaces use a fine border and low shadow; no glass blur, sheen or translating hover. `glass-card` remains a compatibility class name until all consumers are migrated.

Use one primary action per section, secondary actions for navigation and explicitly labelled destructive actions. Cards should have a heading, time/source context where clinical data appear, and meaningful empty/loading/error states. Alerts must name **measured critical**, **experimental model**, **calculated**, or **AI-generated** evidence in text. Charts must show units, observation gaps and a text/table alternative. Dark mode uses the same semantic hierarchy, not a separate decoration scheme.

Implementation status: tokens, shell surfaces, active navigation, hover reduction and a separate public shell are implemented. The login form keeps MFA alongside credentials at desktop and mobile widths. Role workspaces and representative screenshots are now implemented. Shared-token migration of older specialist pages remains incremental.

On 21 October, the Operations and Profile & Security secondary pages adopted the shared field surface and semantic positive, warning, negative and neutral state styles. These states use different light/dark colours while preserving the same meaning. The Operations backup state now uses a positive style only when the API reports `verified`; its monitoring copy describes the API process rather than a particular host. Local synthetic screenshots and the focused contrast/responsive check are in [secondary-page evidence](../evidence/secondary-theme-2026-10-21/README.md).

## Section concepts and current implementation

| Section | Primary task | Layout and visual language | Status |
|---|---|---|---|
| Doctor | Clinical review and decisions | Priority queue, selected-patient observations, separated measured trends, notes and escalation | Implemented in role workspace; trend uses observed values only |
| Nurse | Complete care work | Patient worklist, scheduled observations, tasks and medication administration | Implemented against care APIs |
| Patient | Understand own record | Plain-language measurement ledger, reading chronology, source and device context | Implemented in role workspace |
| Administrator | Manage access and operations | Operational status, governance summary and management links | Implemented against admin operations API |
| Machine learning | Inspect research evidence | Metric strip, confusion matrix, calibration, candidate table and provenance | Installed legacy and observed-target candidate are separated; saved ROC/PR coordinates, uncertainty and false-prompt burden are displayed for the candidate |
| AI assistant | Review generated evidence | Conversation, structured evidence, missing-data and provider state | Evidence workspace with session conversation, source references, missing-data and provider status |
| Wearables | Check connections and synchronisation | Device status and sync detail within patient workspace | Dedicated connected-devices route with device-sourced reading table, sparse observations, missing-field disclosure and sync/error states |
| Alerts | Triage monitoring events | Inbox, read history, filtering and case links | Event-oriented monitoring centre with clinical filter, read history and case-register distinction |
| Care, reports, referrals, research, account | Complete domain-specific workflows | Forms, records and timelines according to task | Operations and Profile & Security have focused light/dark and responsive checks; other secondary routes still need route-level visual review |

All new views use the shared surface, text, border and accent tokens. The research page must state that evaluation is retrospective and must never render invented curve points or imply external validation. The clinical trend chart must preserve gaps, and its table remains available to assistive technology.

Axe checks found and corrected light-surface contrast in the shared muted-text token and inactive monitoring tabs; dark-mode legacy `text-slate-500` is mapped to the semantic muted token. Desktop, tablet and mobile reflow plus light/dark theme checks are in `frontend/tests/e2e/workspace-review.spec.ts`. At narrow chart widths, the observed-vitals chart yields to its accessible table alternative.
