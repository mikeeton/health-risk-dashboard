# Development issues and fixes

This document records the main issues found during the project review and the
actions taken to make the system more suitable for a Final Year Computer
Science project.

## 1. Database Source of Truth

Problem: Users appeared to be missing when the backend connected to a different
database source.

Cause: A SQLite fallback could hide the real PostgreSQL database state during
development.

Resolution: The backend now requires a PostgreSQL `DATABASE_URL`. Alembic is
the normal migration path, and startup schema recovery is kept behind an
explicit development flag.

Lessons Learned: Healthcare-style systems need one clear database source of
truth. Silent fallbacks make debugging harder and can create dangerous
misunderstandings about stored records.

## 2. Admin Access Boundary

Problem: Admin users had too much potential visibility into patient clinical
areas.

Cause: Some admin permissions were mixed with clinical permissions, which made
admin feel like a super-clinician instead of a system-management role.

Resolution: Admin users now manage accounts, approvals, assignments, audit logs,
and metrics. Clinical patient queries return no rows for admin users, and
legacy admin clinical endpoints are blocked.

Lessons Learned: Administrative access and healthcare access should be separate.
Least-privilege design is easier to test when it is expressed in one central
access-control function.

## 3. Staff Assignment Model

Problem: The original patient model only supported one primary doctor and one
assigned nurse.

Cause: Staff access was stored directly on the `patients` table, which cannot
represent realistic care teams.

Resolution: The `patient_staff_assignments` table was added. It supports many
doctors and many nurses per patient, tracks active/removed status, and records
who made the assignment.

Lessons Learned: When a relationship can naturally involve many records on both
sides, it should be modeled as its own table rather than squeezed into fixed
columns.

## 4. Safe Admin Assignment Workflow

Problem: Admins needed to assign doctors and nurses without opening full patient
medical records.

Cause: Assignment management and patient clinical data were previously too close
together.

Resolution: Admin assignment endpoints now return only safe directory fields:
patient id, patient name, linked user id, linked email, staff identity, role,
and assignment status. The frontend has a dedicated staff assignment page.

Lessons Learned: A feature can expose the minimum data needed for a workflow.
Not every patient-related page needs to reveal clinical information.

## 5. Registration Approval Consistency

Problem: Approving a patient registration created a patient profile but did not
write into the new assignment table.

Cause: The registration flow still used the old primary-doctor/nurse ownership
columns.

Resolution: Patient approval now creates initial doctor and nurse assignment
rows. Doctor-created patients also receive initial assignment rows.

Lessons Learned: When a data model changes, every creation path must be updated,
not only the migration for existing records.

## 6. Clinician Action Validation

Problem: Clinical notes and escalation text were sent through query strings.

Cause: The early role-action endpoints accepted simple query parameters, which
was quick but not ideal for validation or privacy.

Resolution: Doctor and nurse role-action endpoints now use validated JSON
payloads. Doctors can add diagnoses, treatment plans, clinical notes, and
escalations. Nurses can add nursing notes and alerts. Admin users are blocked
from these clinician endpoints.

Lessons Learned: Sensitive text should be sent in request bodies with explicit
schemas. This improves validation, documentation, and frontend integration.

## 7. Security Tests

Problem: The project needed automated proof that role permissions and patient
isolation worked.

Cause: Manual testing was not enough for a role-based healthcare application.

Resolution: Security tests now cover admin-only routes, public registration
creation, admin review protection, doctor/patient isolation, admin clinical
isolation, staff assignment grants/removal, and clinician action validation.

Lessons Learned: Security rules should be executable. Tests make it much easier
to prove that fixes remain in place.

## 8. Frontend Routing and Navigation

Problem: Admin navigation still linked to clinical report areas.

Cause: Earlier UI routes treated admin as a global role instead of a separate
system-management role.

Resolution: Admin navigation now focuses on users, approvals, assignments, and
audit logs. Doctor-only analytics and reports are guarded in frontend routes.

Lessons Learned: Frontend navigation should reflect backend permissions. Hidden
or blocked screens are less confusing when users are not routed toward them.

## 9. UI Consistency

Problem: The application header felt generic and visually inconsistent with the
dashboard pages.

Cause: The top bar mostly contained utility buttons and did not explain the
current workspace.

Resolution: The layout now has a role-aware header showing workspace context,
role badge, and selected patient context for clinical users.

Lessons Learned: Small layout improvements can make a project feel more
complete during demonstration, especially when they reinforce the system's role
model.

## 10. Performance and Build Cleanliness

Problem: PDF, charting, icon, and animation libraries could inflate the initial
frontend bundle.

Cause: Large libraries were imported into normal app paths.

Resolution: Route-level lazy loading, Vite manual chunks, and dynamic PDF
imports split the bundle into smaller purpose-based files.

Lessons Learned: Performance improvements are not only backend work. Frontend
bundle structure matters for perceived quality and load time.

## 11. Operational Readiness

Problem: The project needed clearer readiness controls for caching, rate
limiting, health checks, and load balancing.

Cause: The initial project focused on features before operational concerns.

Resolution: Middleware now adds security/cache headers, request IDs,
response-time headers, and in-memory rate limiting. `/health/live` and
`/health/ready` support deployment checks, and `/metrics` is admin-only.

Lessons Learned: Production readiness is a collection of small controls. Each
one reduces uncertainty when deploying or presenting the system.

## 12. Notification System Maturity

Problem: Notification buttons and panels felt mostly cosmetic and did not give
users enough meaningful feedback.

Cause: The earlier notification UI was based mostly on local clinical alerts and
did not consistently persist events, unread state, or role-based history.

Resolution: Notifications are now stored in PostgreSQL with read/unread state,
related links, related entity metadata, user targeting, and role-aware delivery.
The frontend bell and notification centre now support search, filtering, badges,
loading states, empty states, mark-one-read, and mark-all-read.

Lessons Learned: Notifications should be treated as workflow objects, not just
visual alerts. They are most useful when tied to real actions such as
assignments, referrals, registrations, escalations, and alerts.

## 13. Referral Approval and Record Sharing

Problem: Clinicians needed a way to refer patients without automatically
granting access to sensitive records.

Cause: Direct assignment gives access immediately, but referral workflows need a
review step for privacy and accountability.

Resolution: A `referral_requests` table and referral API were added. Doctors
and nurses can request referrals for accessible patients. Admins can approve,
reject, or request more information. Approval adds the receiving clinician to
the care team and records the action in audit logs and notifications.

Lessons Learned: Healthcare access workflows should separate the request from
the permission change. Admin approval creates an accountable checkpoint before
medical record access is expanded.

## 14. PostgreSQL Availability During Admin Review

Problem: The admin approval page showed "Failed to load requests".

Cause: The backend could not connect to PostgreSQL at `localhost:5432`, so the
registration-request API failed.

Resolution: The admin approval UI now shows a clearer message telling the user
to check the backend and PostgreSQL. The README also includes a troubleshooting
checklist for this exact case.

Lessons Learned: A professional UI should tell users what to check next when a
dependency is unavailable, especially for backend/database failures.

## 15. Code Explanation and Maintainability

Problem: The project had many moving pieces, but some of the most important
privacy and workflow decisions were only visible by reading the implementation
closely.

Cause: Earlier comments mostly described local mechanics, while the final-year
project needed clearer explanation of why access control, referral approval, and
notification scoping work the way they do.

Resolution: Comments and docstrings were added across the backend models,
access-control helpers, notification utilities, referral routes, assignment
routes, registration approval flow, frontend API helper, notification UI, layout
navigation, and referral page.

Lessons Learned: Useful comments should explain intent, security boundaries, and
workflow reasoning. They should not merely repeat what a line of code already
says.

## 16. Release Hardening

Problem: The project needed stronger evidence for browser behavior, password
administration, database integrity, realtime notifications, and deployment.

Cause: Backend unit/security tests alone do not show that the React application
loads correctly in a real browser, and application-level validation should be
reinforced by database constraints where possible.

Resolution: Playwright E2E smoke tests were added, the admin user-management
screen now supports admin-verified password resets, Alembic adds workflow
constraints and partial unique indexes, notification polling is backed by an
authenticated WebSocket update channel, and the [deployment guide](../setup/DEPLOYMENT.md) documents production
setup.

Lessons Learned: A final-year healthcare platform should demonstrate both
feature behavior and operational readiness. Tests, constraints, realtime update
paths, and deployment notes make the system easier to defend during review.

## 17. Role-Specific Dashboard Cleanup

Problem: Some patient, nurse, doctor, and admin screens still exposed panels
that felt intended for another role.

Cause: Earlier dashboard composition reused broad clinical components before
the role model was fully tightened.

Resolution: Patient dashboards now avoid clinician-only queue, report,
forecast, and activity panels. Doctor and nurse workflows keep their own
clinical actions, while admin pages remain system-management focused. The AI
assistant text and prompts were adjusted so patient, doctor, and nurse use cases
feel distinct.

Lessons Learned: Role-based security is not only backend permission checks.
The interface should also reduce confusion by showing each user only the
workflows that make sense for their responsibilities.

## 18. Responsive Layout and Theme Polish

Problem: Mobile and tablet layouts could feel cramped, and the app shell kept
desktop sidebar spacing even when the sidebar was hidden on smaller screens.

Cause: The shell animation always applied desktop left margin, and some
controls used desktop-oriented spacing or fixed minimum widths.

Resolution: The app shell now switches its content margin based on the desktop
media query. Header actions, dashboard controls, patient selection, login,
registration, and upload pages were adjusted to stack and size correctly on
phone, tablet, laptop, and desktop widths. Playwright tests now verify that
core public pages and the authenticated app shell avoid horizontal overflow.

Lessons Learned: Responsive design should be tested as behavior, not just
visually inspected. A small automated overflow check catches layout regressions
that are easy to miss on a large monitor.

## 19. Password Visibility and Adaptive Theme

Problem: Users could not reveal passwords while typing, and theme behavior was
basic rather than adaptive to device preferences.

Cause: Password inputs were plain `type="password"` fields, and the theme
loader defaulted to light mode unless dark mode had already been saved.

Resolution: A reusable `PasswordField` component now provides accessible
show/hide controls for login, registration, and admin-verified password reset.
The theme system now follows the user's device preference when no explicit
choice is saved, stores the user's toggle choice, sets browser `color-scheme`,
and improves form field contrast, placeholders, focus rings, and caret behavior
in both light and dark mode.

Lessons Learned: Small interaction details matter in a professional healthcare
platform. Password visibility, theme persistence, contrast, and focus behavior
make the app feel more complete and easier to use during demonstration.
