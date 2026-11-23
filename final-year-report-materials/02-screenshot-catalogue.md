# Screenshot Catalogue and Report Placement

Use only screenshots that support a specific claim. Crop browser chrome if
required, keep a consistent width, obscure personal data, and refer to every
figure in the surrounding report text.

| Priority | Figure | File | Suggested caption | Placement and supported claim |
|---|---|---|---|---|
| Essential | 4.1 | `01-login-page.png` | Login interface for authorised system users | Chapter 4: shows the public authentication entry point and link to access requests. |
| Essential | 4.2 | `02-access-request.png` | Registration request interface for doctor, nurse, and patient accounts | Chapter 4: shows role selection and conditional patient-profile fields. |
| Optional | 5.1 | `03-admin-dashboard.png` | Administrator dashboard providing access-management functions | Chapter 5: establishes the admin-only navigation boundary. |
| Essential | 5.2 | `04-user-management.png` | Administrative user-management interface using synthetic accounts | Chapter 5: supports the account status, role, suspension, and password-reset discussion. |
| Essential | 5.3 | `05-registration-approvals.png` | Registration approval interface using a synthetic access request | Chapter 5: demonstrates explicit approval and rejection controls. |
| Essential | 5.4 | `06-staff-assignments.png` | Staff-to-patient assignment interface using synthetic records | Chapter 5: shows how patient access is linked to an active clinical assignment without displaying clinical details. |
| Essential | 5.5 | `07-admin-referrals.png` | Administrative referral-review interface using a synthetic referral | Chapter 5: demonstrates approve, request-more-information, and reject decisions. |
| Essential | 5.6 | `08-audit-logs.png` | Administrative audit-log interface using synthetic events | Chapter 5: supports the auditability and CSV-export explanation. |
| Essential | 5.7 | `09-doctor-dashboard.png` | Doctor dashboard presenting synthetic assigned-patient monitoring data | Chapter 5: combines vitals, risk, case escalation, clinical notes, and an explicitly synthetic AI summary. |
| Essential | 5.8 | `10-advanced-analytics.png` | Analytics interface presenting a synthetic vital-sign timeline | Chapter 5: illustrates trend-oriented decision support; do not claim clinical validation. |
| Essential | 5.9 | `11-review-cases.png` | Review-case workflow using a synthetic escalation | Chapter 5: demonstrates status transitions and clinician notes. |
| Essential | 5.10 | `12-ai-assistant.png` | AI-assisted clinical-support interface using synthetic output | Chapter 5: shows structured summary, concerns, recommendations, prompt shortcuts, and the question field. |
| Essential | 5.11 | `13-reports.png` | Clinical-report interface using synthetic monitoring data | Chapter 5: demonstrates report preview and PDF-generation controls. |
| Optional | 5.12 | `14-nurse-dashboard.png` | Nurse workspace and role-specific navigation | Chapter 5: use only if the report discusses role-specific workspaces separately. |
| Essential | 5.13 | `15-upload-vitals.png` | CSV vital-sign upload interface and expected schema | Chapter 5: supports the data-ingestion explanation. |
| Optional | 5.14 | `16-patient-dashboard.png` | Patient workspace restricted to personal health functions | Chapter 5: supports the patient-facing access-boundary discussion. |
| Essential | 6.1 | `17-login-mobile.png` | Responsive login interface at a 390 × 844 viewport | Chapter 6: visual evidence of a mobile layout; pair it with Playwright overflow-test results. |

All authenticated images use a test-only session and synthetic intercepted
responses. The synthetic data is intentionally obvious through names such as
“Demo Patient A”, the `.invalid` email domain, and on-screen warnings. These
images demonstrate interface implementation only.

## High-value database-backed replacements

Before final submission, prioritise recapturing the following with PostgreSQL
running and demonstration records seeded:

1. Doctor dashboard showing assigned demonstration patients and risk status.
2. Patient detail view showing vitals charts and medication information.
3. Live-vitals panel showing simulated updates.
4. Advanced analytics with visible charts.
5. Referral lifecycle: clinician request and administrator approval.
6. Notification centre showing read/unread workflow.
7. Audit log showing a non-sensitive demonstration event.
8. PDF/report preview.

Label all demonstration or synthetic data clearly. Never include real patient
names, dates of birth, identifiers, clinical notes, access tokens, passwords,
API keys, or database credentials.

## Caption style

Use this form beneath every image:

**Figure 5.2: Administrative user-management interface using synthetic
accounts (Source: Author’s implementation, 2026).**

Check your institution’s preferred caption and source format before applying
it throughout the report.

## How to introduce a figure

Do not place an image into the report without explanation. Use this pattern:

1. State the requirement or implementation feature before the figure.
2. Insert the numbered figure.
3. Explain two or three visible controls after the figure.
4. State the security or design significance.
5. State any limitation of the evidence.

Example:

> The administrator manages account roles and status through a protected user
> management page, as shown in Figure 5.2. The interface separates role,
> status, password reset, and suspension controls. This supports centralised
> account governance; however, the displayed accounts are synthetic and the
> figure does not independently prove backend authorisation.
