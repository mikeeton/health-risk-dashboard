# Report-Ready Figure Commentary

Adapt these paragraphs to your own writing style. Keep the limitations because
they make the report more academically credible.

## Figure 4.1 — Login

Figure 4.1 presents the public login interface through which approved users
enter the application. The form requests an email address and password and
includes a password-visibility control to support input accuracy. A separate
link directs new users to the access-request workflow. The simplicity of this
screen reduces the amount of information exposed before authentication. The
figure demonstrates the frontend entry point; backend JWT validation and
account-status checks should be explained separately using source-code and API
evidence.

## Figure 4.2 — Access request

Figure 4.2 shows the access-request form. The applicant selects a doctor,
nurse, or patient role, while patient applications expose additional profile
fields such as age, gender, known conditions, medication notes, and lifestyle
notes. The request does not immediately grant access: it enters an
administrator-controlled approval workflow. This separation reduces the risk
of unrestricted self-registration. Sensitive health details should be
minimised and handled according to the project’s privacy requirements.

## Figure 5.2 — User management

Figure 5.2 illustrates centralised account administration. It provides role
and status visibility together with administrator-verified password reset and
account suspension actions. The synthetic account set also demonstrates that
the interface distinguishes administrators, doctors, nurses, and patients.
The disabled suspension control for the administrator visible in the figure
helps protect against accidental loss of administrative access.

## Figure 5.3 — Registration approval

Figure 5.3 shows a pending synthetic patient application with explicit Approve
and Reject actions. This supports the requirement that newly requested
accounts remain inactive until reviewed. The interface also displays limited
clinical context to assist the decision. In a real deployment, collection and
display of this information would require a defined lawful basis, data
minimisation, access logging, and an appropriate retention policy.

## Figure 5.4 — Staff assignment

Figure 5.4 presents the staff-assignment workflow. The administrator selects a
patient, a clinical role, and an eligible staff member, while the current
assignment table records the resulting relationship. The page intentionally
uses directory-level information instead of opening the patient’s clinical
record. This visually supports the backend model in which active
staff-to-patient assignments constrain clinician access.

## Figure 5.5 — Referral approval

Figure 5.5 demonstrates the administrative stage of the referral lifecycle.
The reviewer can approve the request, request further information, or reject
it while adding an administrative note. The page presents the referring and
receiving staff, urgency, status, and reason without opening the complete
clinical record. This design supports controlled record sharing, although the
actual enforcement must occur in backend access-control checks.

## Figure 5.6 — Audit logs

Figure 5.6 shows searchable and filterable audit events with user, action,
entity, identifier, and timestamp fields. The CSV export control supports
administrative review and evidence preservation. The displayed events are
synthetic, so the figure demonstrates presentation and available controls
rather than proving the completeness or tamper-resistance of production logs.

## Figure 5.7 — Doctor dashboard

Figure 5.7 combines assigned-patient context, recent vital signs, a risk score,
open review cases, escalation controls, clinical-note entry, recent activity,
and a structured AI-assisted summary. This provides clinicians with a
consolidated view instead of requiring navigation across disconnected records.
All displayed values are synthetic and the AI text explicitly instructs the
clinician to verify source data. Neither the figure nor the prototype should
be interpreted as evidence of medical-device certification or clinical
validation.

## Figure 5.8 — Advanced analytics

Figure 5.8 presents a time-ordered series of synthetic vital-sign readings
alongside deterioration scoring and medication adherence. The increasing risk
values demonstrate how changes over time can be made easier to inspect.
Because the underlying records were generated for interface capture, the
figure illustrates visualisation behaviour only and must not be reported as a
measured clinical result.

## Figure 5.9 — Review cases

Figure 5.9 shows an escalated patient case with its risk level, risk score,
status, clinician note, and status-transition controls. The actions support a
simple workflow from review through resolution or further escalation.
Backend tests and route inspection are still required to establish that only
authorised clinical users can perform these transitions.

## Figure 5.10 — AI assistant

Figure 5.10 demonstrates the structured presentation of an AI-assisted
summary, including risk level, summary, concerns, and recommendation. Prompt
shortcuts and a free-text question field support different clinical
information needs. The captured response is synthetic; therefore, the figure
should be used to explain the interface and safety framing, not AI accuracy.
The report should state that generated content requires professional review.

## Figure 5.11 — Reports

Figure 5.11 shows how patient identity, risk, recent measurements,
machine-learning output, and an AI-assisted explanation are assembled into a
report preview. The PDF control allows the clinician to produce a portable
summary. Since exported clinical documents can contain sensitive information,
the discussion should cover access control, secure storage, appropriate
sharing, and the limitations of automatically generated content.

## Figure 5.13 — CSV upload

Figure 5.13 shows the health-dataset upload interface and the expected CSV
columns. Displaying the schema helps users prepare compatible data and reduces
formatting errors. The application calculates risk rather than trusting an
uploaded risk score. The report should additionally discuss server-side
validation, rejected rows, file-size restrictions, and the fact that uploaded
data quality directly affects downstream analysis.

## Figure 6.1 — Mobile layout

Figure 6.1 presents the login interface at a 390 × 844 viewport. It provides
visual support for responsive design and should be paired with the Playwright
test that checks common viewport widths for horizontal overflow. A single
screenshot does not prove full accessibility; keyboard navigation, focus
visibility, colour contrast, labels, and assistive-technology behaviour require
separate evaluation.

