# Regulatory preparation — research prototype

This repository supplies engineering evidence; it does not claim regulatory approval or clinical effectiveness.

## Intended purpose boundary

The current intended purpose is AI-assisted research and clinician decision support for reviewing longitudinal monitoring data. It is not a diagnosis, autonomous triage system or replacement for professional judgement. Deterministic critical thresholds operate independently of ML and generative AI.

## Evidence map

| Obligation | Repository evidence | Remaining external evidence |
|---|---|---|
| Intended purpose and limitations | `docs/ML_MODEL_CARD.md`, interface warnings | Approved final intended-use statement |
| Risk management | deterministic overrides, shadow mode, drift suspension, incident records | Clinical hazard analysis and accountable sign-off |
| Data governance | consent controls, access boundaries, audit logs, dataset hashes | Controller agreements, DPIA, retention approvals |
| Model lifecycle | version approval, rollback settings, evaluation artifact | Independent validation and change-control board |
| Human oversight | alert ownership, acknowledgement and resolution | Human-factors study with representative users |
| Performance | grouped test metrics, calibration, fairness, prospective outcomes | Representative outpatient validation and prospective study |
| Cybersecurity | authentication, MFA, sessions, rate limits, secrets and tests | Penetration test and production threat review |
| Accessibility | semantic remediation and automated tests | Manual WCAG audit and assistive-technology user testing |

## Release gate

Clinical live mode must remain disabled until the accountable organisation approves the intended purpose, risk file, data protection assessment, representative validation, usability evidence, monitoring plan, incident process and applicable conformity route. Approval decisions must be recorded in the model-governance history.
