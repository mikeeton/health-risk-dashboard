# Screenshot Quality Audit

## Audit outcome

All 17 images were reviewed for loading states, clipping, broken values,
privacy, misleading claims, synthetic-data labelling, readability, and value
to the report.

## Corrections made

- Replaced a registration screenshot that showed only `Loading...`.
- Added synthetic records to previously empty administration, approval,
  assignment, referral, audit, review-case, analytics, and clinical pages.
- Replaced awkward role labels with `Report Demo Admin`, `Dr Report Demo`,
  `Nurse Report Demo`, and `Report Demo Patient`.
- Replaced ordinary-looking names with `Demo Patient A` and
  `Demo Patient B`.
- Used the reserved `.invalid` domain for every demonstration email address.
- Removed an `undefined/10` machine-learning display by supplying the expected
  response structure.
- Added explicit text stating that risk, AI, referral, audit, and clinical
  information is synthetic and not a clinical result.
- Increased the post-render wait to prevent animated content from being
  clipped beneath the sidebar.
- Captured long analytics and reports pages at viewport height to avoid a
  browser full-page screenshot artefact involving the fixed sidebar.
- Cropped the CSV upload figure to its main content because the browser’s
  sticky-header capture was visually distracting and added no evidence.
- Added essential/optional priorities so the final report is not overloaded
  with repetitive screenshots.

## Final usefulness decisions

### Essential

The login, access request, user management, registration approval, staff
assignment, referral approval, audit logs, doctor dashboard, analytics, review
cases, AI assistant, reports, CSV upload, and mobile login figures each support
a distinct requirement or implementation claim.

### Optional

The admin landing page, nurse landing page, and patient landing page are
visually clear but contain mainly navigation cards. Include them only when
explaining role-specific navigation. If the report has a strict word or page
limit, omit these three before removing any essential figure.

## Remaining evidence limitation

PostgreSQL was unavailable during capture. The authenticated images therefore
use test-only local sessions and intercepted synthetic responses. They are
valid interface evidence, but they do not demonstrate:

- a successful PostgreSQL transaction;
- backend permission enforcement;
- a live WebSocket update;
- a genuine Groq response;
- predictive accuracy;
- clinical validation;
- deployment availability; or
- successful PDF content after download.

Use route code, automated test output, database evidence, or final
database-backed captures for those claims.
