# Role workflow implementation

The role expansion uses PostgreSQL-backed, audited workflows. Frontend
visibility is not the security boundary: every patient-scoped endpoint calls
the shared assignment-aware access-control layer.

## Patient

- Dedicated **My Care** and **AI Assistant** navigation.
- Appointment request, reschedule, and cancellation.
- Secure care-team messaging.
- Profile, emergency contact, GP, and practice details.
- Versioned consent preferences and data-rights requests.
- Immediate JSON health-record export plus formal export/correction requests.
- Signed, explicitly patient-visible reports and clinical documents only.
- Symptom diary, side-effect, pain, questionnaire, and wellbeing outcomes.
- Password changes, rotating sessions, session revocation, and encrypted TOTP
  MFA.

## Doctor

- Persistent assigned-patient switching; unassigned patients remain hidden.
- Appointments, secure messaging, task assignment, and follow-up worklists.
- Versioned SOAP notes, diagnoses, care plans, reports, and handovers.
- Electronic signing and patient-visibility control.
- SNOMED CT, ICD-10, LOINC, and dm+d code capture.
- Investigation ordering and results.
- Alert ownership, acknowledgement, escalation due time, resolution reason,
  and reopening.
- Local duplicate/allergy medication checks.

## Nurse

- Persistent assigned-patient switching and care worklist.
- Real tasks rather than an AI placeholder.
- Observation schedules with next-due and overdue-escalation windows.
- NEWS2, pain, falls, mobility, wound, fluid-balance, and general assessments.
- Medication administration records with mandatory exception reasons and
  optional care-team witness.
- Secure messaging, structured handover documents, and alert ownership.

## Admin

- Service-health and AI-governance dashboard.
- Organisation/facility/department/ward hierarchy.
- Granular role-permission records.
- Notification and escalation rules.
- Data-rights queue and auditable resolution.
- Operational/privacy/clinical-safety incident register.
- Password-free user export.
- Single-use 30-minute password-reset links; raw tokens are never stored.

## External production gates

Some safety-critical functions cannot be made clinically valid using local
code alone:

- Full drug interaction and contraindication checking requires a licensed,
  maintained medicines database.
- Terminology code validation/search requires licensed or approved terminology
  services and release management.
- Barcode identity verification requires approved scanners and device/GS1
  integration.
- Offline storage of identifiable health data requires an approved encrypted
  device-management design, remote wipe, conflict resolution, and a clinical
  safety case. The application deliberately does not cache PHI offline.
- SMS/email delivery of reset links, reminders, and alerts requires an approved
  messaging provider and templates.
- Multi-tenant production use additionally requires an organisation-scoped
  database isolation review, not merely UI filtering.

These dependencies must remain labelled unavailable until configured and
clinically/governance approved.
