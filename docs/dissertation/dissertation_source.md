<!--ABSTRACT-->
Continuous health data can support earlier recognition of deterioration, but a useful monitoring system must combine timely information with strict access control, intelligible evidence and safe failure behaviour. This dissertation presents the design, implementation and retrospective evaluation of the Health Risk Dashboard, a full-stack research prototype for patients, doctors, nurses and administrators. The system combines a React and TypeScript interface, a FastAPI service, PostgreSQL persistence, Redis-assisted notification broadcasting, WebSocket updates, wearable integration, deterministic clinical thresholds, a calibrated machine-learning pipeline and a constrained Groq-assisted clinical summarisation service. Development followed an iterative, risk-led methodology in which privacy boundaries and deterministic escalation were treated as primary requirements. The retrospective model predicts a critical vital-sign event within six hours using PhysioNet/CinC Challenge 2012 data. On the internal test set it achieved a ROC-AUC of 0.833 and sensitivity of 0.724, but precision was only 0.038, demonstrating a substantial false-positive and alert-fatigue risk. External Set B performance showed a ROC-AUC of 0.785 and sensitivity of 0.724. The implementation therefore supports shadow operation, drift monitoring, structured evidence, SHAP explanations and automatic suspension rather than presenting the model as autonomous diagnosis. Fifty backend tests, a successful frontend production build and lint, and browser/accessibility test infrastructure provide engineering evidence; the latest browser rerun also exposed unresolved development-server timing failures that require correction. Prospective clinical validation, representative outpatient validation, completed human usability evaluation, clinical effectiveness and regulatory approval remain outstanding. The work demonstrates that responsible health-AI engineering depends as much on governance, traceability and honest limitation reporting as on predictive discrimination.
<!--BODY-->

# CHAPTER ONE: INTRODUCTION

## 1.1 Background of the Study

Digital health systems increasingly collect physiological and behavioural information outside the traditional consultation. Heart rate, oxygen saturation, blood pressure, activity and sleep can be measured repeatedly, creating an opportunity to identify worsening patterns before a patient presents with an obvious crisis. The practical challenge is not simply to collect more data. Measurements must be associated with the correct patient, transmitted reliably, interpreted in context and presented to an authorised professional without creating an unmanageable stream of alarms. A monitoring application must therefore be considered a socio-technical system in which clinical workflow, security, usability, data quality and algorithmic behaviour interact.

Artificial intelligence has intensified interest in anticipatory monitoring. Machine-learning models can combine several measurements and temporal features to estimate risk, while large language models can turn structured records into readable summaries. These capabilities are potentially valuable, but health care is a high-consequence setting. A model may perform well on average while failing for an under-represented group; an apparently fluent assistant may invent evidence; and an alerting system may reduce safety when low precision overwhelms clinicians. Topol (2019) argues that the most useful role for AI is to augment rather than replace clinical judgement. This principle informed the present project: deterministic urgent rules remain independent of the predictive model, and generated language is labelled as assistance rather than diagnosis.

The Health Risk Dashboard was developed as a full-stack clinical monitoring and research prototype. It provides distinct experiences for patients, doctors, nurses and administrators. Patients can inspect their own information, clinicians can switch among assigned patients, and administrators can manage accounts, assignments and operational governance without receiving general access to clinical records. Live data may enter through manual observations, a simulator, CSV upload or a Withings integration. PostgreSQL supplies durable storage, while WebSockets and Redis-compatible broadcasting support responsive notifications. The system also contains an offline machine-learning pipeline and a restricted research workspace for model evaluation, usability evidence, shadow validation and prospective outcome adjudication.

## 1.2 Problem Statement

Many prototype health dashboards emphasise attractive visualisation but omit the controls needed for safe deployment. Common weaknesses include shared demonstration accounts, hard-coded credentials, client-side-only permissions, unvalidated AI output, incomplete audit trails and models evaluated on randomly split rows that leak information between the training and test sets. A further problem is the gap between an academic model and a clinical workflow. A probability has limited value unless the user can see its timeframe, model version, evidence, data freshness and next action. Likewise, a technically “live” notification is not useful if reading it causes it to disappear permanently or if multiple application instances cannot broadcast consistently.

The initial project exhibited several of these practical weaknesses during development. Frontend pages called endpoints that did not exist or were addressed with incorrect patient identifiers, producing repeated HTTP 404 responses. Notification calls returned 401 when session handling and token refresh were inconsistent. A production frontend was blocked by CORS configuration, externally hosted fonts conflicted with Content Security Policy, and an early deployment monitor timed out while the backend waited for its database. Test data accumulated in the account list, form fields lacked identifiers and labels, and role navigation exposed misleading links. These were not merely cosmetic defects: they revealed weak contracts between components and prompted a systematic redesign.

## 1.3 Aim and Objectives

The aim of this project was to design, implement and evaluate a secure, role-aware, AI-assisted health risk dashboard that supports continuous monitoring while making its experimental and non-diagnostic status explicit.

The objectives were to:

- implement authenticated workflows for patients, doctors, nurses and administrators;
- enforce patient-level authorisation on the backend and support clinician switching only among assigned patients;
- ingest, validate, deduplicate and store longitudinal observations with provenance;
- provide durable notification history, unread state, live updates and escalation workflows;
- combine deterministic emergency thresholds with a versioned, retrospectively evaluated predictive model;
- constrain the AI assistant to controlled patient data, validated structure and evidence-linked responses;
- provide model governance, shadow validation, drift monitoring and research evidence collection;
- evaluate security, functionality, accessibility, build quality and retrospective model performance; and
- document errors, corrective actions, limitations and the work required before real clinical use.

## 1.4 Research Questions

The investigation was guided by four questions. First, how can a full-stack dashboard deliver live patient information while preserving role and patient boundaries? Second, how can machine-learning and generative-AI functions be integrated without allowing them to override deterministic safety rules or fabricate clinical evidence? Third, what engineering and evaluation controls are needed to expose false positives, drift, accessibility problems and deployment failures? Fourth, to what extent does the completed prototype satisfy its academic objectives while remaining honest about the absence of clinical validation and regulatory approval?

## 1.5 Scope and Limitations

The scope includes software design, database modelling, role-based workflows, device-shaped data ingestion, monitoring, alerts, AI assistance, machine-learning evaluation, research infrastructure, deployment preparation and automated testing. The model outcome is a critical vital-sign event within the following six hours, defined by oxygen saturation below 90%, heart rate below 40 or above 140 beats per minute, systolic blood pressure of at least 180 mmHg, or diastolic pressure of at least 120 mmHg. The application is a research prototype and not a medical device approved for diagnosis or treatment.

Several boundaries are material. Training and retrospective validation use adult intensive-care data rather than a representative smartwatch or ordinary outpatient population. Fields such as steps, sleep and calories are absent from the selected ICU cohort and were left missing rather than invented. Human usability sessions, prospective clinical validation and comparative effectiveness studies require ethics approval, recruited participants and accountable clinical oversight; software infrastructure cannot substitute for this evidence. The project also does not establish compliance with every organisational retention, incident-response or medical-device requirement. These limitations define future work rather than hidden implementation gaps.

## 1.6 Organisation of the Dissertation

Chapter Two reviews continuous monitoring, clinical early warning, machine learning, explainability, generative AI, human factors and governance. Chapter Three translates that evidence into requirements and describes the iterative methodology. Chapter Four presents architecture, data flow, security boundaries and design decisions. Chapter Five explains implementation in the backend, frontend, data, AI, ML and deployment layers, including errors encountered. Chapter Six reports engineering and retrospective evaluation. Chapter Seven discusses the results and their implications. Chapter Eight concludes and recommends the evidence-generating work required before clinical deployment.

## 1.7 Chapter Summary

This chapter established the need for a monitoring system that integrates technical responsiveness with privacy, safety and evaluation. It defined a bounded research prototype, specified the research questions and made clear that implementation completion is not equivalent to clinical effectiveness or regulatory approval.

# CHAPTER TWO: LITERATURE REVIEW

## 2.1 Introduction

This chapter reviews the concepts that shaped the dashboard. The literature is organised around continuous monitoring, early warning, longitudinal modelling, explainability, generative assistance, alert fatigue, usability, security and regulation. The purpose is not to argue that one algorithm solves clinical deterioration, but to identify the combination of evidence and safeguards needed for responsible decision support.

## 2.2 Continuous Monitoring and Digital Health

Wearable and connected devices change the temporal character of health information. Instead of a single observation recorded during a consultation, a service may receive repeated values over hours or days. Dunn, Runge and Snyder (2018) describe how wearable biosensors may contribute to personalised health monitoring, while also emphasising analytical and validation challenges. Continuous streams can reveal trends, variability and deviations from an individual baseline, but they also contain missingness, motion artefacts, inconsistent sampling and device-specific bias. A dashboard that treats every value as equally reliable risks converting measurement noise into clinical noise.

Interoperability is therefore more than a networking concern. A reading requires a patient identity, timestamp, unit, measurement type, provenance and correction status. The project uses explicit database fields and integration metadata rather than accepting an unlabelled number. Withings-style OAuth connections and webhook identifiers allow external events to be deduplicated. Manual and simulated values are marked differently from device-originated readings. This design reflects the general principle behind standards such as HL7 FHIR: health information should be exchanged as structured resources with interpretable context (HL7 International, 2019).

Remote monitoring may support earlier attention, but benefits depend on service design. Noah et al. (2018) found that wearable biosensors can influence outcomes in some settings, although evidence varies by intervention and population. A more recent systematic review by Lu et al. (2023) likewise found substantial variation in technologies used to measure cardiovascular function among community-dwelling adults. This heterogeneity makes a simple claim that monitoring itself improves outcomes methodologically weak. Technology adoption also depends on comfort, trust, digital literacy, connectivity and the capacity of staff to respond. Consequently, the dashboard includes failure states and operational monitoring rather than assuming that data availability guarantees action. WebSocket updates improve immediacy, while database persistence and polling recovery prevent the live channel from becoming the only source of truth.

## 2.3 Early Warning and Deterministic Safety

Early warning scores commonly aggregate physiological measurements to identify deterioration. Their attraction lies in transparent thresholds and predictable escalation, but a fixed population threshold may overlook a patient-specific decline that remains inside the nominal range. Conversely, a single abnormal reading can be transient or erroneous. The project therefore separates two concerns. Actual extreme readings trigger deterministic escalation guidance, while non-critical observations may be assessed by trends and a predictive model. This separation prevents a probabilistic service failure from suppressing an objectively urgent signal.

Deterministic rules are not presented as complete clinical judgement. They define a conservative software safety boundary. Oxygen saturation below 90%, extreme heart rate and very high blood pressure are routed through rule-based logic before any Groq or ML call. The advantage is testability: given the same value, the system must always produce the same escalation outcome. The disadvantage is limited context, since thresholds may be affected by chronic disease, prescribed targets or measurement error. For this reason the interface presents evidence and escalation conditions, while clinical action remains the responsibility of an authorised professional.

## 2.4 Machine Learning for Clinical Risk

Machine learning can estimate a future event from several current and historical variables. Rajkomar, Dean and Kohane (2019) explain that clinical ML requires careful definition of the prediction target, data representation and evaluation. A vague “risk score” is not an adequate outcome because its meaning may be circular or dependent on the same rules being modelled. The present project defines an observable endpoint: a critical vital event within six hours. The label is created from future observations, not from the dashboard’s own displayed risk category.

Temporal data create a serious leakage hazard. If rows from the same patient appear in training and testing, the model can learn patient-specific patterns and produce an unrealistically favourable evaluation. The pipeline therefore separates patients, not merely rows, across training, validation and test partitions. Rolling means, variability, deltas and slopes are calculated chronologically. This feature engineering represents trend information while preserving the prediction time boundary. Missing wearable fields in the ICU dataset remain missing and are processed consistently, because fabrication would falsely imply information that the source never measured.

Class imbalance is a second central problem. Critical events are uncommon, so accuracy can appear high even when a model rarely identifies the positive class. Precision, recall, specificity, PR-AUC and the false-negative rate are consequently more informative than accuracy alone. The selected operating threshold of 0.014 favours sensitivity. On the internal test set, sensitivity is approximately 0.724 but precision is 0.038. In practical terms, most positive prompts would not be followed by the defined event. This result does not invalidate the research exercise; it shows why alert burden and shadow validation must be assessed before live notification.

Calibration concerns whether estimated probabilities correspond to observed frequencies. Niculescu-Mizil and Caruana (2005) demonstrated that classifiers with useful discrimination may still produce poorly calibrated probabilities. The pipeline records a Brier score and calibration points, and the runtime labels the active model version and threshold. Calibration matters because the apparent difference between a 2% and 10% probability may influence prioritisation. A probability must not be interpreted as a precise patient-specific truth when the population, missingness pattern or device differs from the training data.

External validation examines transportability beyond the development split. The project uses PhysioNet/CinC Challenge 2012 Set A for development and Set B as an external retrospective check (Goldberger et al., 2000; Silva et al., 2012). Performance decreases from a test ROC-AUC of 0.833 to 0.785, while sensitivity remains about 0.724. This is useful evidence of reproducibility within a related ICU challenge cohort, but it is not validation in ordinary outpatient or smartwatch users. Dataset shift can arise from disease severity, devices, sampling, care processes and missing variables. The system therefore records reference distributions and may suspend inference after repeated drift violations.

## 2.5 Anomaly Detection and Patient Baselines

Supervised classification depends on labelled outcomes, whereas anomaly detection asks whether a new pattern differs from the learned distribution. Isolation Forest was included as a research signal, not as a diagnosis. It may identify unusual combinations of values, but “unusual” is not synonymous with “dangerous.” An athletic resting heart rate, chronic low oxygen target or newly connected device may appear anomalous without representing deterioration. The interface consequently distinguishes anomaly information from the supervised probability and deterministic thresholds.

Personal baselines can reduce false positives by comparing a patient with their own recent history. Rolling mean, standard deviation, delta and slope features support this idea. However, a baseline can become unsafe if the reference period already contains deterioration or if too few readings are available. The dashboard records missing information and data freshness, and it avoids silently replacing unavailable measurements. Two consecutive abnormal predictions, worsening trends, patient-group thresholds and suppression of unchanged predictions are available as governance strategies, but their values require clinical review rather than arbitrary optimisation.

## 2.6 Explainability and SHAP

Clinical users need to understand why a system has raised a prompt. Lundberg and Lee (2017) introduced SHAP as a unified approach to feature attribution based on Shapley values. In the dashboard, local contributions identify which input features moved an individual prediction, while a restricted global view reports mean absolute contributions across an evaluation sample or stored prospective predictions. These explanations describe model behaviour; they do not establish causation. A high contribution from heart-rate variability does not prove that variability caused a future event.

Explainability can itself mislead. Ghassemi, Oakden-Rayner and Beam (2021) argue that many current explainability methods in health care can create a false sense of understanding without establishing that a model is safe or clinically valid. Feature attributions may also be unstable when variables are correlated, and an attractive chart can create unwarranted confidence in a weak model. The interface therefore pairs SHAP with probability, timeframe, model version, data quality, missing fields and deterministic status. Global SHAP figures are generated from recorded model evidence for dissertation analysis, not written manually. This improves reproducibility but does not turn association into causation or remove the need for clinical interpretation and external validation.

## 2.7 Generative AI in Clinical Decision Support

Large language models can summarise records, answer questions and reduce the effort required to navigate longitudinal data. Singhal et al. (2023) demonstrated substantial medical question-answering capability, but their human evaluation also identified limitations in factual grounding, harm and bias. Lee, Bubeck and Petro (2023) similarly distinguish promising language capability from evidence of safe clinical use. Fluent output can therefore obscure unsupported statements rather than remove uncertainty. The assistant in this project is designed around evidence-linked structure. Each response contains a summary, risk level, supporting evidence, missing information, recommended checks, escalation conditions, an evidence-support indicator and a safety warning. Evidence references an exact controlled record and timestamp. The provider output is validated against a strict schema, and a strong evidence-support value without matching evidence is rejected. This field describes support within the retrieved record; it is not a calibrated uncertainty estimate.

Prompt injection is particularly important because clinical notes and uploaded documents may contain text that resembles instructions. The assistant treats all patient content as untrusted data and places it inside a controlled context rather than allowing it to modify the system instruction. Current PostgreSQL records are retrieved through bounded server-side functions instead of sending an uncontrolled history assembled by the browser. Conversation memory is patient-specific and encrypted; changing patient clears the active context so details cannot migrate into another conversation.

Resilience controls are also required. A remote model may time out, return malformed JSON, become unavailable or incur unexpected cost. The Groq integration has retry limits, timeouts, circuit breaking, daily budget controls and a deterministic fallback. Emergency values bypass the provider entirely. The interface states “AI-assisted—not a diagnosis,” and displays generation time, provider-model version, freshness, evidence and an evidence-support indicator. These features respond to the broader governance concerns raised by the World Health Organization (2021), which emphasises autonomy, transparency, accountability, inclusiveness and safety in health AI.

## 2.8 Alert Fatigue and Human Factors

Alert fatigue occurs when a high volume of low-value warnings reduces attention and response quality. Ancker et al. (2017) found that repeated alerts and workload affect clinician responsiveness. The project’s low precision makes this concern concrete. If a prompt fires for approximately one quarter of observations while only a small fraction precede the specified outcome, unfiltered live delivery would be difficult to justify. Shadow mode stores predictions without notifying clinicians, allowing later classification as true positive, false positive, true negative or false negative.

The design also treats acknowledgement and resolution as different actions. Reading a notification removes it from the unread list but retains it in notification history. Structured alert fields include ownership, deadline, contact status, intervention and resolution reason. Administrators can monitor alerts per patient and clinician, duplicate suppression, response time, escalation breaches, false-positive reviews and the proportion that produced an intervention. These operational measures connect algorithm performance to workflow burden.

## 2.9 Usability and Accessibility

Usability affects safety because a technically correct function can fail when users cannot locate, understand or operate it. Nielsen’s usability heuristics remain useful for examining consistency, feedback, error prevention and recovery (Nielsen, 1994). The System Usability Scale provides a short standardised questionnaire that yields a score from ten responses (Brooke, 1996). The restricted research workspace calculates SUS scores only for consented, pseudonymous sessions with an ethics reference. Empty forms do not count as completed evaluation.

Accessibility was treated as an engineering requirement rather than a final cosmetic check. Form controls require names and associated labels; keyboard focus must be visible and ordered; charts require textual descriptions or accessible tables; validation errors should be announced; motion must respect reduced-motion preferences; and layouts must remain usable at 200% zoom. Automated Axe and Playwright tests address critical and serious detectable issues, but they cannot prove WCAG conformance. Formal testing with screen-reader users, including NVDA, VoiceOver and real task completion, remains necessary. This interpretation follows the WCAG 2.2 principles of perceivability, operability, understandability and robustness (W3C, 2024).

## 2.10 Security, Privacy and Governance

Health records require confidentiality, integrity and availability. Role-based access alone is insufficient if every doctor can access every patient. The application combines role checks with active staff-patient assignments. Patients can access only the record linked to their account, clinicians can access only assigned patients, and inaccessible records return 404 to avoid confirming their existence. Administrators manage users and assignments but are deliberately excluded from routine clinical endpoints. This separation reduces privilege while supporting organisational operation.

Authentication uses hashed passwords, short-lived access tokens, rotating refresh sessions, revocation, MFA support and login/session controls. Clinical responses use no-store caching and production security headers. Audit events record important changes. Secrets belong in environment variables rather than source control, and exposed API or database credentials must be rotated. The project experienced the practical importance of this rule when a credential was shared during configuration; the response was to treat it as compromised and require replacement rather than relying on obscurity.

Governance extends beyond cybersecurity. NIST’s AI Risk Management Framework organises continuous activity around Govern, Map, Measure and Manage functions (Tabassi, 2023). The dashboard therefore contains an active model version, approval history, shadow/live selection, threshold controls, rollback, drift limits, automatic suspension and retirement reasons. Joint good-machine-learning-practice principles from the FDA, Health Canada and MHRA further emphasise representative datasets, independent test sets, human–AI team performance, clear user information and monitoring of deployed models (FDA, Health Canada and MHRA, 2021). The MHRA's current Software and AI as a Medical Device programme also shows that UK requirements continue to evolve; a prototype cannot infer regulatory status from technical functionality alone (MHRA, 2024). Research records are separated from care workflows. Regulatory documentation states intended purpose and evidence gaps, but does not claim approval. This distinction is essential: software controls can prepare evidence, while a competent organisation and regulator determines whether the evidence is sufficient.

Transparent reporting is also a design requirement. TRIPOD+AI requests explicit reporting of data sources, participant selection, missing data, model specification, evaluation and open-science materials for clinical prediction models (Collins et al., 2024). CONSORT-AI adds trial-reporting requirements when an AI intervention is evaluated prospectively, including the intended use, input data, human interaction and analysis of errors (Liu et al., 2020). DECIDE-AI addresses the earlier stage at which human factors, workflow integration and safety should be examined before a large comparative trial (Vasey et al., 2022). These guidelines serve different study stages; none converts retrospective software evaluation into clinical validation. The project’s model card, dataset hash, locked metrics, limitation statements and research workspace were aligned with this direction. They do not constitute compliance certification, but they make later evaluation more reproducible and less vulnerable to selective reporting.

## 2.11 Literature Review Summary

The literature indicates that safe monitoring depends on longitudinal data quality, transparent escalation, patient-separated evaluation, calibration, external validation, usable presentation and continuous governance. It also shows why a high ROC-AUC cannot compensate for low precision, dataset mismatch or poor workflow integration. These findings informed the requirements and methodology presented in Chapter Three.

# CHAPTER THREE: REQUIREMENTS ANALYSIS AND METHODOLOGY

## 3.1 Introduction

This chapter translates the literature and observed project defects into functional and non-functional requirements. It then explains the iterative, risk-led methodology used to develop and evaluate the prototype.

## 3.2 Stakeholders and Functional Requirements

Four principal user groups were identified. Patients require access to their own information, reports, device status, medications, appointments, messaging and privacy controls. Doctors need a searchable assigned caseload, longitudinal evidence, documentation, referrals, reports, alerts and AI-supported review. Nurses require a shift-oriented worklist, observations, administration records, care tasks and escalation. Administrators require user lifecycle, assignment, policy, integration, audit, health and governance controls without routine access to clinical content.

TABLE|Identifier|Requirement|Acceptance principle
TABLE|FR-01|Authenticate active users and enforce role-aware navigation|Protected APIs reject missing, expired or inappropriate credentials
TABLE|FR-02|Limit patient data by ownership or active assignment|Cross-patient and cross-clinician requests return no data
TABLE|FR-03|Store validated observations with timestamp and provenance|Invalid values fail schema checks; accepted data persist in PostgreSQL
TABLE|FR-04|Provide durable and live notifications|Read items leave unread view but remain in notification history
TABLE|FR-05|Support deterministic and predictive alerts|Critical values always override ML; shadow mode suppresses ML notices
TABLE|FR-06|Generate structured, evidence-linked AI assistance|Malformed or unsupported provider output is rejected safely
TABLE|FR-07|Provide restricted research and governance functions|Only administrators can access research evidence endpoints
CAPTION|Table 3.1: Principal functional requirements.

The staff-patient relationship was treated as a many-to-many assignment rather than a single “doctor owns patient” field. This supports care teams and allows a doctor or nurse to switch among assigned patients without seeing the whole database. Removal of an assignment must immediately remove access. Referrals do not silently grant access; administrative approval creates or changes the assignment. These rules are enforced by backend queries rather than hidden buttons alone.

## 3.3 Non-Functional and Safety Requirements

Security requirements include least privilege, password hashing, token expiry, session revocation, MFA capability, secure secret handling, auditability and protection against cross-patient disclosure. Reliability requirements include readiness checks, migration versioning, database connection limits, retry and timeout policies, durable notification state and fallbacks for Redis or provider failure. Performance requirements include responsive route loading, code splitting, bounded API calls and visibility of prediction/AI latency.

Usability requirements include readable clinical colours, consistent spacing, accessible names, keyboard navigation, reduced motion and responsive behaviour. Safety requirements are more specific: deterministic critical thresholds may not depend on Groq or the trained model; every AI claim must cite available evidence; unavailable data must be disclosed; model inference must be suspendable; and predictions must carry a timeframe and version. A governance requirement prohibits presenting retrospective performance as prospective effectiveness.

## 3.4 Development Methodology

An iterative prototyping approach was used because requirements emerged through direct testing of working screens and APIs. Each cycle involved inspecting a workflow, reproducing a defect, identifying its underlying contract, implementing the smallest coherent correction and adding proportionate verification. This resembles agile development, but the prioritisation was risk-led rather than feature-count-led. Authentication, patient isolation and urgent escalation took precedence over animation and visual polish. The lifecycle evidence was maintained in a manner compatible with the NIST functions: governance defined authority, mapping described context and affected users, measurement quantified model and software behaviour, and management introduced suspension, rollback and fallback controls (Tabassi, 2023).

The work progressed through several broad iterations. An initial dashboard established pages and basic data display. A database-backed phase replaced assumptions with PostgreSQL models and access-control functions. A clinical-workflow phase introduced assignments, medications, referrals, reports, tasks and notifications. A production-readiness phase added migrations, health checks, CORS, CSP, secure environment configuration, Redis, backups and monitoring. An intelligence phase introduced model training, SHAP, assistant validation, shadow mode and research governance. Accessibility and cross-role browser checks were then used to refine interaction details.

## 3.5 Machine-Learning Methodology

The prediction target was defined before model selection. A row is positive when a qualifying critical vital event occurs in the following six-hour window. PhysioNet/CinC Challenge 2012 Set A was prepared into chronological patient records. The dataset was separated by patient into 17,920 training, 4,480 validation and 5,600 test records. Candidate class-weighted logistic-regression and random-forest pipelines were fitted to the training partition and compared on the validation partition. The training script selected the candidate with the highest validation ROC-AUC, using F1 only as a tie-breaker. Logistic regression was therefore selected because its validation ROC-AUC was 0.810, compared with 0.791 for random forest. Sensitivity was not the primary model-selection rule.

Feature engineering produced rolling means, standard deviations, deltas and slopes. After candidate selection, sigmoid calibration was fitted with CalibratedClassifierCV on validation data. Threshold selection was a separate step: among candidate thresholds that achieved validation sensitivity of at least 0.70, the script maximised Youden's J statistic. This produced an operating threshold of 0.014 and intentionally traded specificity and precision for sensitivity. The resulting locked process was evaluated on the test set. Set B was used as a related external cohort without retraining. Isolation Forest was trained separately on negative training examples as an anomaly signal, and SHAP evidence was generated to describe feature influence. Dataset hash, outcome definition, feature schema, metrics, reference distributions and limitations were stored with the versioned artifact.

The committed artifact is identified as model version physionet-critical-v1. Reporting decisions were informed by TRIPOD+AI rather than by the best-looking metric alone (Collins et al., 2024). The dissertation therefore states the source population, outcome window, partition sizes, candidate algorithms, operating threshold, confusion matrix, discrimination, calibration, subgroup results and intended-use boundary. The distinction between model development, retrospective external validation and future prospective evaluation is maintained throughout.

## 3.6 Evaluation Methodology

Engineering evaluation combined unit/API tests, browser automation, linting, compilation, production building and structural migration checks. Security scenarios included role restrictions, patient isolation, assignment removal, session expiry, prompt injection, malformed AI output, duplicate webhooks and deterministic overrides. Accessibility automation used Axe with Playwright, keyboard skip-link tests, 200% zoom checks and reduced-motion checks. Operational scenarios were documented for Redis outage, PostgreSQL restart, backup restoration and multi-instance deduplication.

Model evaluation reported confusion matrices, ROC-AUC, PR-AUC, sensitivity, specificity, precision, F1, calibration and Brier score. Gender and age-group results were recorded with warnings about small samples. The study did not recruit users or clinicians; instead it implemented a protocol and collection system for future SUS, prospective outcome and effectiveness evidence. This decision avoids the methodological error of presenting simulated participant records as human evaluation.

## 3.7 Ethical Considerations

The prototype minimises unnecessary exposure by enforcing patient scope and separating administrative operation from clinical review. Research forms accept pseudonymous participant codes and require consent confirmation and an ethics reference. The outpatient import pipeline requires a declared licence and provenance and refuses to invent missing measurements. Provider governance must be confirmed before real patient data are sent to Groq, including contractual terms, retention, regional processing, audit requirements and clinical approval.

## 3.8 Chapter Summary

This chapter defined a set of role, data, notification, AI, ML, accessibility and governance requirements and described a risk-led iterative methodology. The next chapter shows how these requirements were translated into architecture and detailed design.

# CHAPTER FOUR: SYSTEM ANALYSIS AND DESIGN

## 4.1 Introduction

The system was designed as a layered application with clear authority boundaries. The browser is responsible for presentation and interaction, but the backend remains authoritative for identity, patient scope, validation and clinical records. Intelligence components provide bounded evidence to workflows rather than controlling access or deterministic escalation.

## 4.2 High-Level Architecture

[[FIGURE|architecture.png|Figure 4.1: Layered architecture of the Health Risk Dashboard.|Diagram showing data sources and the React client connected to FastAPI, PostgreSQL, live messaging, safety and intelligence, and operational services.]]

[[ARCHITECTURE_TABLE]]

Figure 4.1 summarises how the presentation, application, persistence, messaging, intelligence and operational components are separated. React pages call a central API service that attaches an access token and handles refresh behaviour. FastAPI routes validate requests through Pydantic models, resolve the active user, apply role and assignment filters, and interact with SQLAlchemy sessions. PostgreSQL stores users, patients, assignments, observations, medications, events, notifications, audit entries, predictions and research evidence. Redis pub/sub supports broadcast across instances, while stored notification state and polling provide recovery. External systems include Withings, Groq, error reporting, object storage and managed hosting.

## 4.3 Role and Trust Boundaries

[[FIGURE|role_access.png|Figure 4.2: Role and patient-access boundary.|Diagram showing patient, doctor, nurse and administrator requests passing through backend identity, role and assignment checks before clinical or administrative access.]]

Figure 4.2 places the backend policy boundary between every role and the protected records. The trust model rejects the assumption that an authenticated user may access all records. An administrator may create users and assignments but cannot use normal patient-detail, vital, medication or Groq-assistant endpoints. A doctor or nurse receives accessible patient identifiers from active assignments and can switch only within that set. A patient query is constrained by the user identifier linked to the patient record. These rules are centralised in access-control functions so new routes can reuse the same policy.

The frontend duplicates some role checks for navigation and user experience, but they are not security controls. Direct API calls remain subject to backend checks. Returning 404 for inaccessible patients prevents an attacker from distinguishing a missing record from an existing record outside their scope. Audit logs record sensitive administrative and workflow changes, supporting later investigation.

## 4.4 Data Design

The relational design centres on User, Patient and PatientStaffAssignment. A patient has many vital observations, medications, events, cases, alerts and prediction records. Notifications are targeted to a user or role and have per-user read state. Withings connections store encrypted OAuth details and external measurement identities for deduplication. Auth sessions store hashes rather than raw refresh tokens. Model governance events preserve changes to modes, thresholds, approvals and suspension.

Research evidence is separated into usability sessions, prospective validation outcomes and effectiveness records. This prevents a research questionnaire from being mistaken for a clinical event. Prospective outcomes reference a prediction and an authorised adjudicator. Effectiveness records store pseudonymous study arms and outcomes under an approved protocol. Alembic migrations make each schema change explicit and reversible where practical.

## 4.5 Observation and Alert Data Flow

[[FIGURE|data_flow.png|Figure 4.3: Observation-to-alert data flow.|Six-stage flow from receiving and validating a measurement through deduplication, persistence, deterministic safety evaluation and notification.]]

Figure 4.3 shows the ordering of persistence and safety evaluation in the observation path. A measurement enters through a validated API, simulator or integration webhook. The integration checks identity and deduplicates repeated events before storing measurement and provenance. Deterministic safety evaluates actual critical values. When a threshold is crossed, an urgent structured alert is written and broadcast regardless of model availability. For a non-critical reading, the runtime may calculate features, drift distance, probability, anomaly status and SHAP contributions.

In shadow mode, the prediction is stored without producing an ML notification. When the six-hour window has elapsed, authorised research workflow can associate the observed outcome and classify the prediction. In live mode, configurable confirmation and cooldown rules can suppress duplicates or unchanged predictions. The alert retains supporting readings, timestamps, model version, probability, quality, assignment and escalation deadline. A clinician may acknowledge, intervene and resolve with a reason; reading the notification affects only unread state.

## 4.6 AI Assistant Design

[[FIGURE|ai_safety.png|Figure 4.4: Evidence-bound AI assistant pipeline.|Pipeline showing authorised retrieval, an untrusted-data boundary, Groq generation, schema validation, safety rejection and evidence-linked presentation.]]

Figure 4.4 shows the evidence and validation boundaries around the external provider. The Groq AI Assistant follows a retrieve-validate-present pattern. The server retrieves only data the current user may access and constructs controlled evidence objects with identifiers and timestamps. Patient notes are delimited as untrusted content. Groq is asked for a strict JSON-compatible structure, after which Pydantic validation and additional safety checks verify required fields, timestamps, evidence support and risk level. The interface describes the schema's numeric support field as an evidence-support indicator rather than model confidence. Provider-generated “Critical” classifications are rejected so that critical status remains deterministic.

Memory is partitioned by patient and encrypted using a dedicated key. Switching patient clears the previous patient's stored assistant memory and resets the visible conversation, reducing contamination risk. Retry limits, a timeout, circuit breaker and daily request boundary contain provider failure. A deterministic fallback produces an unavailable or evidence-limited response rather than a plausible fabrication. The interface presents source evidence, the evidence-support indicator, provider-model metadata, data freshness and a non-diagnostic warning.

## 4.7 Interface and Accessibility Design

The interface uses a restrained clinical palette, strong contrast, consistent icon placement and responsive cards. Role-aware navigation reduces irrelevant options. Doctors and nurses receive a patient switcher showing assigned caseload only. Notifications use a badge, dropdown and full history page, with live update and polling recovery. Risk information is structured into current status, timeframe, probability, evidence and action rather than hidden in a long note.

Semantic design includes labels associated with controls, unique identifiers, accessible button names, a skip-to-content link, visible focus, meaningful headings and screen-reader-only chart tables. Responsive tests cover phone and tablet widths, while 200% zoom checks guard against horizontal overflow. Animation respects the reduced-motion media query. Automated checks improve consistency, but manual assistive-technology evaluation remains a required external activity.

## 4.8 Deployment and Operational Design

[[FIGURE|deployment.png|Figure 4.5: Production deployment topology.|Diagram showing a Vercel frontend, Render FastAPI service, Aiven PostgreSQL database, Redis and external Groq, Withings and Sentry services.]]

Figure 4.5 presents the intended hosted topology rather than evidence that every external service is currently enabled. The frontend is suitable for a static platform such as Vercel and reads the backend origin from an environment variable. The FastAPI service uses managed PostgreSQL through a TLS connection and exposes live and ready endpoints. Readiness verifies database access rather than merely confirming that the process exists. Startup waits for the database, applies Alembic migrations and then launches the server. Connection pool size and overflow are deliberately limited for small managed plans.

Production CORS allows only configured frontend origins. The CSP uses local fonts or explicitly trusted sources. Secrets are held in platform environment settings, not committed files. Redis is recommended for multi-instance notification broadcast and shared operational state. Error reporting, encrypted-backup and verification scripts, health monitoring, and deployment workflows provide mechanisms for operational evidence. Their presence does not prove that a production backup has completed or been restored successfully. An overdue-observation monitor can be enabled by an administrator to control hosting cost rather than running permanently.

## 4.9 Threat Model

TABLE|Threat|Potential consequence|Principal mitigation
TABLE|Cross-patient request|Disclosure of another patient’s health data|Assignment-scoped backend queries and 404 response
TABLE|Forged or replayed webhook|False or duplicated observation|Known connection lookup, OAuth-backed retrieval from Withings and external-measurement deduplication
TABLE|Prompt injection in notes|Assistant follows malicious patient text|Untrusted-data boundary, schema validation and evidence checks
TABLE|Stolen session|Unauthorised access|Expiry, refresh rotation, revocation, MFA and HTTPS
TABLE|Provider outage|Missing or unsafe AI response|Timeout, circuit breaker and deterministic fallback
TABLE|Model population shift|Unreliable predictions|Reference profile, shadow mode, drift limits and suspension
TABLE|Lost live event|Unseen alert|PostgreSQL truth, Redis broadcast and polling recovery
CAPTION|Table 4.2: Summary threat model.

## 4.10 Chapter Summary

This chapter presented the layered architecture, role boundaries, data model, observation flow, AI safety design, accessible interface and operational safeguards. The design intentionally separates durable truth, deterministic safety, experimental prediction and generative presentation. Chapter Five describes how these decisions were implemented and refined.

# CHAPTER FIVE: SYSTEM IMPLEMENTATION

## 5.1 Introduction

Implementation converted the design into a full-stack codebase and exposed several errors that were not visible at the diagram stage. This chapter explains the principal technologies and modules, then analyses problems encountered and their corrective lessons.

## 5.2 Backend Implementation

FastAPI was selected for typed request handling, asynchronous interfaces and automatic API documentation. The application entry point registers routers for authentication, patients, vitals, medications, events, notifications, assignments, referrals, integrations, ML, AI and research. Pydantic schemas reject malformed payloads before business logic. SQLAlchemy maps domain objects to PostgreSQL, while dependency-injected sessions create a consistent transaction boundary.

Access control is centralised. The current-user dependency decodes a JWT, confirms token type, loads the active user and rejects suspended accounts. Patient query helpers add user-specific predicates. Admin dependencies protect user management and research routes. This removed earlier route-by-route assumptions and made negative security tests possible. Passwords are hashed using Argon2, refresh sessions rotate and can be revoked, and MFA uses time-based one-time passwords.

Alembic migrations document the growth from the baseline schema through assignments, referrals, auth sessions, Withings, notification reads, AI safety, care workflows, clinical operations, MFA, password reset, system settings, shadow validation and research evidence. The current revision is 20260807_0017. Migration-first deployment avoids a fragile pattern in which application startup silently creates partial tables. A guarded schema-recovery option remains available only for local recovery.

## 5.3 Clinical Workflows and Role Experiences

The patient experience exposes the linked personal record, measurements, medications, reports, assistant and account security. Doctor workflows include assigned-patient search and switching, alerts, notes, diagnoses, treatments, referrals, reports and summaries. Nurse workflows support observations, medication status, notes, tasks and escalation. Administrative pages manage users, requests, assignments, referrals, audit information, system operation and research governance.

[[FIGURE|screenshots/02-doctor-dashboard.png|Figure 5.1: Doctor dashboard displaying an assigned patient and current clinical observations.|Screenshot of the doctor dashboard showing four assigned patients, three high-risk patients, the selected patient’s heart rate, oxygen saturation, blood pressure and risk score, with clinical note and escalation controls.]]

Figure 5.1 demonstrates how the doctor view combines caseload context with a selected-patient summary. The counts provide prioritisation without replacing individual review, while the observation cards preserve units and the clinical-action panels keep documentation and escalation close to the evidence. The screenshot also shows that the model can report an unavailable state rather than presenting a fabricated prediction.

[[FIGURE|screenshots/05-nurse-dashboard.png|Figure 5.2: Nurse dashboard organised around bedside care activities.|Screenshot of the nurse dashboard with medication, vital-observation, alert and task cards and navigation restricted to nursing workflows.]]

The nurse view in Figure 5.2 intentionally emphasises action categories rather than analytical density. Medication, observations, alerts and tasks provide clear entry points for repeated care activities, while the header identifies the selected assigned patient. The reduced navigation set illustrates role-aware presentation; enforcement remains on the backend.

[[FIGURE|screenshots/06-admin-dashboard.png|Figure 5.3: Administrator dashboard for non-clinical platform governance.|Screenshot of the administrator dashboard showing user, assignment, approval, referral and audit-log functions without patient observations.]]

Figure 5.3 provides visible evidence of administrative separation. The administrator can manage identities, care-team access, approvals, referrals and audit records, but the page does not display routine clinical measurements. This supports least privilege and reduces the assumption that organisational authority automatically grants clinical access.

The patient switcher is populated from backend-accessible patients, not a frontend mock list. When selection changes, the health-data context refreshes patient-scoped endpoints and clears AI conversation state. This addresses the risk that a clinician could retain details from a previous patient. Assignment removal affects the access query immediately. Referral approval creates controlled access instead of relying on a free-text recommendation.

Structured documentation and medication workflows were implemented as database-backed events and records. Alerts carry ownership and resolution information. Reports can be generated and downloaded according to role. Account security provides password change, MFA/session visibility and revocation. These features transformed the project from a single analytic dashboard into a set of connected care workflows, although production organisations would still need local terminology, prescribing and policy integration.

## 5.4 Notification and Live-Data Implementation

Notifications are persisted with audience, category, severity, related entity, destination and read state. The header dropdown requests unread notifications, displays a badge and marks an item read when opened. The item then leaves the unread view but remains on the full notification page, satisfying both attention and audit needs. Search and read/unread filters operate on durable records.

[[FIGURE|screenshots/04-notifications.png|Figure 5.4: Notification centre with unread inbox and retained read history.|Screenshot of the notification centre showing inbox and read-history tabs, search and a clear empty state for the current doctor.]]

The notification centre shown in Figure 5.4 separates unread work from retained history. Its empty state explains what will appear rather than presenting a blank panel. The design means that reading a notification changes its attention state but does not delete the underlying record, supporting later review and audit.

A token-authenticated WebSocket provides immediate update hints. The browser reconnects and polling continues as a fallback. For multiple backend instances, Redis pub/sub distributes broadcast messages; PostgreSQL remains authoritative. This design corrected the early behaviour in which the WebSocket closed before establishment and the UI appeared unreliable. It also avoids claiming that an ephemeral socket alone guarantees delivery.

Withings integration follows an OAuth connection model. A public webhook receives provider events, validates their context, deduplicates external measurement identities and stores mapped readings. Status routes show connection and synchronisation information. A live simulator supplies changing development data without representing it as a real device. Provenance distinguishes simulator, demonstration seed, CSV upload, manual, Withings and wearable observations. Simulator and seed records are visibly labelled “Synthetic demonstration data” in the dashboard, data table and six-hour prediction panel. Synthetic records support demonstration and testing but were not used to train the committed model artifact.

## 5.5 Machine-Learning Implementation

[[FIGURE|ml_pipeline.png|Figure 5.5: Reproducible machine-learning lifecycle.|Flow from licensed cohort and patient-grouped splitting through temporal features, model selection, calibration, locked evaluation, versioned artifact and shadow monitoring.]]

Figure 5.5 summarises the separation between development, locked evaluation and runtime governance. The offline pipeline prepares a licensed longitudinal CSV, verifies required identifiers and timestamps, creates a genuine future-outcome label, separates patients and builds temporal features. Candidate models are fitted and compared, calibrated probabilities are evaluated, and a threshold is selected on validation data. The resulting model.joblib and evaluation.json must share a schema version before the API loads them. The evaluation artifact also stores dataset SHA-256, model version, reference profiles, fairness tables and limitations.

At runtime, an accessible patient’s latest history is transformed using the same feature contract. Deterministic critical values return a safety-override source without claiming a model probability. Otherwise the versioned model produces the predicted probability of a critical event in the following six hours, the risk window, anomaly information, drift score and local SHAP evidence. The interface reports this value as “Predicted 6-hour critical-event probability” rather than converting it into confidence using the larger class probability. If the artifact is unavailable, the calculated fallback is identified explicitly and no fixed confidence value is shown. Governance selects disabled, shadow or live mode. Automatic suspension can occur after repeated observations exceed the configured drift boundary. The governance setting records an active version and the runtime rejects a loaded artifact with a different version. However, the repository contains only one committed model artifact, so this is version enforcement rather than a demonstrated multi-artifact rollback facility.

[[FIGURE|screenshots/09-six-hour-ml-prediction.png|Figure 5.6: Trained six-hour model output with explicit probability and provenance.|Screenshot of the Six-Hour ML Prediction panel showing the event probability, runtime source, model version and leading SHAP evidence. Synthetic demonstration input is identified when present.]]

Figure 5.6 shows the corrected presentation contract. The 1.8% value is the model's predicted probability of the defined event within six hours; it is not presented as 98.2% confidence. The method line identifies the trained artifact and version, while the evidence list reports local SHAP contributions. This separation prevents the probability, deterministic safety rules and locally calculated health indicators from being treated as interchangeable forms of AI.

The restricted research workspace shows test metrics, global SHAP, shadow confusion counts, usability forms, prospective outcomes and effectiveness records. Global SHAP is calculated from actual contributions and exported with a warning that attribution is not causation. An outpatient import script checks licensing, longitudinal coverage, target validity, provenance, missingness and device groups. It does not pretend that the ICU artifact has become an outpatient model.

[[FIGURE|screenshots/07-research-workspace.png|Figure 5.7: Restricted research evidence workspace.|Screenshot of the administrator-only research workspace showing model version, ROC-AUC, sensitivity, specificity, prospective confusion counts and pseudonymous SUS collection.]]

Figure 5.7 makes the evidence boundary explicit. Retrospective model metrics are visible, while prospective outcomes, effectiveness records and usability sessions remain zero until real approved activities occur. This prevents an implemented form from being confused with completed research and provides a direct route for exporting later evidence.

## 5.6 AI Assistant Implementation

The Groq AI Assistant routes retrieve current observations, medications and events through authorised database queries. Rather than sending one large uncontrolled prompt, the service builds bounded evidence objects. The expected output schema includes summary, risk level, evidence, missing information, recommended checks, escalation conditions, an evidence-support value and a safety warning. Evidence identifiers and timestamps must match the controlled context. Malformed JSON, nonexistent evidence, timestamp alteration, unsupported evidence support and provider-created critical status trigger a safe fallback. Groq is a pre-trained external LLM accessed through an API; it was not trained or fine-tuned in this project.

[[FIGURE|screenshots/03-ai-assistant.png|Figure 5.8: Evidence-linked clinician Groq AI Assistant.|Screenshot of the clinician Groq AI Assistant showing the assigned-patient selector, non-diagnostic warning, generation metadata, stale-data status, evidence-support indicator, structured summary and timestamped evidence.]]

The interface in Figure 5.8 operationalises the assistant safety contract. The top warning states that the content is not a diagnosis, while generation time, provider-model identifier, stale-data badge and provider availability describe context. Risk and evidence support are separated from the narrative, and supporting evidence is presented as a timestamped record rather than an untraceable claim.

Patient text is explicitly labelled untrusted. Conversation history is encrypted and keyed to the patient, and selection changes clear active memory. Provider governance flags confirm whether agreement, retention, regional processing, audit and clinical approval conditions have been reviewed. Network calls have timeouts, limited retries, circuit state and budget limits. The interface exposes generation time and availability rather than spinning indefinitely when Groq is not configured.

The original Groq problem demonstrated that placing an API key in a message or local code is neither sufficient nor safe. The key must be rotated if exposed and stored as a protected environment variable on the backend host. The frontend must never receive it. A separate Fernet key protects stored AI memory. Configuration checks fail safely when required governance or encryption settings are missing.

## 5.7 Frontend Implementation

React and TypeScript provide component composition and compile-time contracts. React Router lazy-loads role pages, while Vite separates chart, motion, icon and PDF libraries into chunks. A central API module handles base URL, bearer credentials, refresh and error conversion. Context providers manage authentication, selected patient, health data, theme and toast feedback. Recharts displays trends, but every chart also receives a text description or data table for non-visual access. Labels distinguish four separate mechanisms: Six-Hour ML Prediction for the trained classifier, Groq AI Assistant for the external LLM, Safety Rules for deterministic critical thresholds, and Calculated Trend Insight or Health Score for local indicators. Synthetic sources receive an explicit provenance badge.

[[FIGURE|screenshots/01-login.png|Figure 5.9: Responsive authentication interface.|Screenshot of the public login interface showing clinical branding, labelled email and password fields, optional authenticator code, access-request route and security messaging.]]

Figure 5.9 illustrates the public authentication boundary. The page provides labelled credentials, an optional one-time authenticator field and a separate access-request route. It does not publish demonstration passwords. Security and AI-assistance statements are presented as concise context rather than as substitutes for the underlying authentication controls.

The visual system evolved from a dark, heavily animated interface toward a restrained clinical design with consistent icon boxes, spacing, card radii and blue-green status colours. Animation remains subtle and disabled by reduced-motion preference. Forms use unique identifiers, names, autocomplete hints and linked labels. Login, registration and dashboard layouts remain usable at narrow widths and zoom. Locally hosted fonts resolved the conflict between external Google Fonts and a restrictive CSP.

## 5.8 Problems, Mistakes and Corrective Actions

The first major mistake was building frontend expectations faster than backend contracts. Pages requested /vitals/1, /events/1, /ml/predict/1 and assistant paths that returned 404. Some routes were absent; others depended on a patient that the logged-in clinician could not access. The correction was not to hide console errors. Endpoint contracts were aligned, accessible-patient selection became authoritative, and empty/unavailable states were added. The lesson is that every visible card must have a defined source, permission and failure behaviour.

Authentication produced repeated 401 notification requests because tokens could expire or be missing while polling continued. WebSocket connections attempted to open and were closed during component lifecycle changes. Central request handling, refresh rotation, explicit socket cleanup, reconnect logic and polling fallback reduced this instability. Negative tests were added for expired and revoked sessions. The lesson is that live UI components must share the same authentication lifecycle as ordinary requests.

Production deployment exposed several configuration errors. The GitHub health workflow initially failed because production URL variables were absent. Once set, the readiness request timed out because the Render service could not complete startup against its database. A hosted frontend then failed login preflight because its origin was absent from CORS. The database later moved from Render to Aiven when free hosting constraints changed; the Aiven URI used the postgres scheme and TLS requirements, and the small connection limit required pool tuning. Configuration normalisation, explicit SSL, wait-for-database logic and health endpoints were implemented. These experiences show that deployment is part of system design, not a final upload step.

Content Security Policy blocked Google-hosted styles because style-src allowed only self and inline rules. Allowlisting a remote font would have enlarged the trust boundary, so fonts were hosted locally and policy remained restrictive. Browser audits also found form fields without id or name attributes and labels without matching controls. These were corrected across shared components, then guarded with Axe and Playwright. The lesson is that browser warnings often identify architectural repetition; fixing the shared component is more reliable than patching one page.

Test data created many disposable admin, doctor, nurse and patient accounts. This made the administration view noisy and raised uncertainty about passwords. The correct response was not to establish a universal password. Seed scripts now create explicit demo data, production has no default credentials, test identifiers are unique, and administrators use controlled reset workflows. Data lifecycle and cleanup are as important as data creation.

A serious security lesson concerned secret handling. API and database credentials appeared in configuration screenshots or messages. Such values must be regarded as compromised, rotated and removed from history where possible. The project was changed to use environment variables and example placeholders. Secrets are backend-only and production checks reject weak settings. This incident is included because omitting it would conceal an important part of secure engineering practice.

The initial ML narrative risked overstating maturity. A supervised pipeline, SHAP and evaluation could be implemented, but the chosen dataset remained ICU-based and precision was very low. The correction was to state the outcome precisely, report all relevant metrics, introduce shadow mode and automatic suspension, and add a lawful outpatient import pathway rather than claiming generalisation. Similarly, usability and prospective-validation forms were implemented without fabricating completed participant studies.

## 5.9 Chapter Summary

This chapter explained the backend, workflows, live notifications, integrations, ML pipeline, AI controls and accessible frontend. The implementation history illustrates how route, authentication, deployment, accessibility, data hygiene, secret-management and evaluation errors were converted into reusable controls and tests.

# CHAPTER SIX: TESTING AND EVALUATION

## 6.1 Introduction

Evaluation examined engineering correctness and retrospective model behaviour. The evidence supports claims about the implemented software and stored artifact; it does not establish clinical effectiveness.

## 6.2 Software Testing

The final verification run completed 50 backend tests. These covered authentication, administrative restrictions, patient-to-patient isolation, clinician assignment boundaries, referral approval, notification scope, AI schema and evidence safety, deterministic early warning, database URL handling, backup encryption, ML pipeline behaviour and research evidence calculations. The Alembic database was confirmed at revision 20260807_0017. These automated tests are particularly important because a role error may not be visible during a normal demonstration.

The final audit on 19 August 2026 confirmed that the TypeScript production build and ESLint passed. The backend suite also passed all 50 tests. The current Playwright rerun was not clean: 3 tests passed, 12 failed and 1 deployment-dependent test was skipped. Most failures involved Vite development-server navigation or dynamically imported modules timing out under the four-worker run, followed by downstream element-not-found failures. Earlier project evidence had recorded 15 passing browser checks and one conditional skip, but that historical result is not presented as the current state. The failed rerun means that login, registration, role navigation, patient switching, notification history and automated accessibility scenarios require diagnosis and a clean repeated run before submission. Because both Axe page tests timed out in the latest run, the previous zero critical/serious finding could not be reproduced during this audit.

TABLE|Test area|Result|Interpretation
TABLE|Backend Pytest|50 passed|Implemented API, safety and evidence scenarios passed
TABLE|Frontend build|Passed|TypeScript and production bundling completed
TABLE|ESLint|Passed|Configured static checks reported no violations
TABLE|Playwright final rerun|3 passed; 12 failed; 1 skipped|Current suite is not clean; most failures followed development-server navigation or dynamic-import timeouts
TABLE|Axe final rerun|Not completed|Both public-page Axe checks timed out, so the earlier zero-finding result was not reproduced
TABLE|Alembic|0017 head|Local schema matched the latest migration
CAPTION|Table 6.1: Final engineering verification summary.

## 6.3 Model Evaluation

[[METRICS_TABLE]]

Figure 6.1 compares the two candidate pipelines at the default 0.5 decision threshold used during model selection. Logistic regression achieved the higher validation ROC-AUC (0.810 versus 0.791), so the selection follows the documented code rule. The random forest's higher validation PR-AUC and precision show that model choice is not uniformly superior across every measure. This trade-off should be reported rather than reduced to a claim that one algorithm was simply "best".

[[FIGURE|candidate_model_comparison.png|Figure 6.1: Candidate-model performance on the validation partition.|Grouped bar chart comparing logistic regression and random forest validation ROC-AUC, PR-AUC and F1 at the default 0.5 threshold.]]

[[FIGURE|confusion_matrix.png|Figure 6.2: Internal test confusion matrix at the 0.014 threshold.|Confusion matrix with 4,121 true negatives, 1,403 false positives, 21 false negatives and 55 true positives.]]

Figure 6.2 makes the operating consequences of the threshold visible: the test confusion matrix contained 4,121 true negatives, 1,403 false positives, 21 false negatives and 55 true positives. The ROC-AUC of 0.833 indicates useful ranking discrimination within the retrospective test data. PR-AUC of 0.166 is more informative for the uncommon positive outcome. Sensitivity of 0.724 reflects the deliberately low threshold, but precision of 0.038 means that only a small proportion of positive prompts corresponded to the defined future event. This creates a clinically important burden.

[[FIGURE|calibration.png|Figure 6.3: Internal test calibration plot.|Line chart comparing observed critical-event frequency with mean predicted probability across ten probability groups and the ideal calibration line.]]

Figure 6.3 shows that calibration is not uniform across the grouped probability range. External Set B produced 19,934 true negatives, 7,551 false positives, 142 false negatives and 373 true positives. ROC-AUC fell to 0.785 and PR-AUC to 0.106. Brier score remained low partly because the event is rare; calibration plots must therefore be examined alongside aggregate score. Gender and age-group subgroup estimates were exported, but small positive counts make some gaps unstable. The results do not prove fairness.

Figure 6.4 shows that sensitivity remained similar between the internal test and Set B, while discrimination and precision decreased. This is related-cohort retrospective evidence because both sets originate from the same ICU challenge context. It neither demonstrates smartwatch generalisation nor establishes that the selected threshold would create an acceptable workload in practice.

[[FIGURE|cohort_metric_comparison.png|Figure 6.4: Internal test and external Set B metric comparison.|Grouped bar chart comparing ROC-AUC, PR-AUC, sensitivity, specificity and precision for the internal test and related external Set B cohort.]]

[[FIGURE|global_shap.png|Figure 6.5: Global SHAP feature influence in the evaluation sample.|Horizontal bar chart of mean absolute SHAP values, led by three-reading systolic blood-pressure mean and heart rate.]]

Figure 6.5 indicates which engineered features most influenced the fitted model across the evaluation sample. Mean absolute SHAP magnitude measures influence on model output, not clinical importance or causality. The figure is therefore useful for auditing model behaviour, but it cannot explain whether an association is clinically valid or transportable to another population.

## 6.4 AI and Safety Evaluation

Assistant tests verified that altered evidence timestamps, nonexistent references, unsupported evidence-support claims, malformed output and provider-generated critical status are rejected. Deterministic critical observations bypass Groq and the model. Prompt-injection-like text remains inside the untrusted patient-data boundary. Provider unavailability produces a safe structured fallback rather than an invented response. These tests demonstrate enforcement of defined controls, not correctness of every possible clinical answer.

## 6.5 Limitations of Evaluation

Automated accessibility tools cannot evaluate the quality of screen-reader interaction, clinical comprehension or cognitive workload. No completed human SUS study is claimed. The model has not been prospectively tested, and its population differs from intended outpatient and wearable users. Redis outage, managed PostgreSQL restart and backup restoration have documented procedures but require repeated staging exercises under realistic load. The browser suite does not yet represent every cross-role workflow with a live seeded production-equivalent database.

TABLE|Evidence area|Current status|Conclusion permitted
TABLE|Software implementation|Implemented and covered by automated tests|The tested workflows behave as specified in the repository environment
TABLE|Model discrimination|Retrospectively evaluated on internal test and Set B|Performance applies to the defined ICU-derived outcome and cohorts
TABLE|Human usability|Protocol and collection infrastructure only|No participant usability result is claimed
TABLE|Prospective clinical validation|Infrastructure only|No prospective performance or patient outcome is claimed
TABLE|Clinical effectiveness|Not evaluated|No claim that the system improves care or outcomes
TABLE|Regulatory status|Preparation documents only|No approval, conformity assessment or medical-device status is claimed
CAPTION|Table 6.3: Evidence maturity and permitted conclusions.

## 6.6 Chapter Summary

Testing provides strong evidence that the implemented contracts build and behave as specified in the covered scenarios. Retrospective discrimination is promising, but low precision and population mismatch prevent a claim of deployment-ready clinical prediction.

# CHAPTER SEVEN: RESULTS AND DISCUSSION

## 7.1 Introduction

Chapter Six reported the observed software and model results. This chapter addresses a different question: what those results mean for the research problem. It explains why the system behaved as observed, relates the findings to the literature, and identifies the conclusions that the evidence does and does not support.

## 7.2 Research Question One: Building a Secure Monitoring Platform

The first research question asked how a full-stack dashboard could support continuous monitoring while preserving role and patient boundaries. The completed software shows that this requires more than hiding navigation items. Access is derived from authenticated identity and active patient-staff assignments on the server, while inaccessible patient identifiers return 404. This matters because a visually correct frontend cannot prevent a user from calling an API directly. The negative access tests therefore provide stronger evidence than screenshots alone: they test the authority boundary on which confidentiality depends.

The persistence and messaging results also explain why the architecture combines PostgreSQL, WebSockets and Redis rather than treating them as interchangeable technologies. PostgreSQL retains the authoritative notification and clinical state; WebSockets reduce the delay before the interface refreshes; Redis distributes invalidation messages when multiple backend instances are used. This layered approach accepts that a socket may disconnect and that Redis may be unavailable without allowing an alert record to disappear. It is consistent with the literature's broader warning that remote monitoring is a service and workflow problem, not simply a device-streaming problem (Lu et al., 2023).

The result is a substantial engineering prototype, but not evidence of operational reliability at clinical scale. The 50 passing backend tests cover defined API and safety scenarios, while the failed final Playwright rerun shows that browser-level assurance is currently incomplete. Neither suite represents every concurrent request, network partition or managed-service failure. Backup and verification scripts demonstrate a recovery mechanism, but only a recorded restoration exercise would demonstrate recoverability. The correct interpretation is therefore that the architecture implements defensible controls and testable failure behaviour, while production assurance remains incomplete.

## 7.3 Research Question Two: Predicting a Six-Hour Critical Event

The second research question concerned whether longitudinal measurements could support a six-hour prediction. The internal ROC-AUC of 0.833 and Set B ROC-AUC of 0.785 show that the classifier ranked positive observations above negative observations more often than chance in both retrospective cohorts. The decrease on Set B is important: it indicates that performance is sensitive even to a related-cohort change. It would be methodologically unsound to treat the internal value as a stable property of the model or compare it directly with studies using different outcomes, populations or prediction horizons. This interpretation follows TRIPOD+AI's emphasis on clearly defined populations, outcomes and evaluation settings (Collins et al., 2024).

The apparent tension between useful ROC-AUC and very low precision is explained by class imbalance and threshold choice. Only 76 of 5,600 internal test observations were positive, an event prevalence of approximately 1.36%. At the 0.014 operating threshold, the model identified 55 of those events but also produced 1,403 false positives. Sensitivity was therefore 72.4%, while only 3.77% of positive predictions corresponded to the defined event. ROC-AUC describes ranking across possible thresholds; it does not describe the workload created by the deployed threshold. PR-AUC and the confusion matrix are consequently more informative for the practical alerting question.

The low threshold was not an accidental coding value. It resulted from a validation rule that first required sensitivity of at least 0.70 and then maximised Youden's J. That choice reflects a preference for missing fewer future critical events, but the test results reveal its cost. Ancker et al. (2017) show why repeated low-value alerts can reduce responsiveness; in this project, the precision result turns that literature concern into a concrete design constraint. Consecutive-positive confirmation, trend confirmation, cooldown and shadow mode can reduce visible alert volume, but their clinical effect has not been measured. They should therefore be evaluated prospectively rather than assumed to solve alert fatigue.

The calibration result also requires cautious interpretation. A Brier score of 0.012 appears low, but rare-event prevalence allows low scores even when positive predictions are operationally problematic. The calibration curve is more informative because it compares predicted and observed frequencies across probability groups. Sigmoid calibration improves the relationship between model scores and probabilities within the validation setting; it cannot correct an ICU-to-outpatient population shift by itself.

The PhysioNet dataset was appropriate for a reproducible retrospective experiment because it contains longitudinal ICU observations and genuine future events. It is nevertheless poorly matched to the product's wearable and outpatient concept. Activity and sleep variables absent from the source were not invented during training, so the fitted model cannot validate claims about those signals. The next scientifically useful step is external validation on a licensed, representative outpatient or wearable cohort before retraining. A large performance drop would not make the project a failure; it would quantify the generalisation limitation that the present evidence already suggests.

## 7.4 Research Question Three: Combining ML, Groq and Safety Rules

The third research question asked how prediction and generative assistance could be integrated without allowing either to replace deterministic safety. The implementation provides a clear answer at the software level. Extreme measured values are evaluated before model inference or Groq generation. The six-hour model supplies a probability for a defined future event. Groq supplies structured language generated by a pre-trained external model. These components have different purposes and evidence bases, so the separation prevents a provider outage or malformed response from suppressing an urgent threshold alert.

The assistant tests show that schema validation, controlled evidence identifiers, timestamp checks and rejection of provider-generated Critical classifications can constrain known failure modes. This is meaningful because medical LLM studies report impressive question-answering capability alongside unresolved grounding, harm and bias concerns (Singhal et al., 2023; Lee, Bubeck and Petro, 2023). However, passing constructed safety scenarios does not demonstrate that every clinically important hallucination will be detected. The evidence-support indicator describes agreement with retrieved records; it is not a calibrated probability that the answer is medically correct.

Patient-specific encrypted memory and clearing the previous patient's stored conversation on a patient switch reduce cross-patient contamination risk. They do not prove resistance to every concurrency, key-management or compromised-account scenario. Similarly, prompt delimiters and instructions make patient text less able to control the model, but no prompt-injection defence can be treated as absolute. The assistant is therefore best interpreted as an evidence-navigation aid whose outputs require user review, consistent with WHO's emphasis on human autonomy, transparency and accountability (World Health Organization, 2021).

## 7.5 Research Question Four: Usability, Accessibility and Governance

The fourth research question concerned whether the system could expose its state and limitations clearly enough to support responsible study. The interface distinguishes unread notifications from retained history, probability from confidence, synthetic demonstration data from the training cohort, and absent evidence from a completed study. These distinctions matter because misleading terminology can alter user trust even when the underlying calculation is correct. The research workspace extends this principle by storing zero completed sessions or unadjudicated outcomes as missing evidence rather than converting infrastructure into a result.

Automated accessibility results provide useful but bounded evidence. Labels, keyboard routes, focus behaviour, reduced motion and 200% zoom can be checked mechanically, whereas comprehension, screen-reader efficiency and clinical workload require human participants. Brooke's (1996) SUS instrument and WCAG 2.2 informed the implemented protocol and interface checks, but no SUS score or formal assistive-technology result is reported. This is an important limitation rather than an unfinished sentence: it prevents the dissertation from confusing technical conformance checks with usability in practice.

Governance controls similarly prepare rather than complete assurance. Shadow/live selection, threshold settings, drift suspension and approval history make model use observable. The repository contains one committed model artifact, so the active-version control enforces a match but does not yet provide true multi-artifact rollback. DECIDE-AI emphasises that early live evaluation must examine workflow, human factors and safety (Vasey et al., 2022). Those activities remain future work and cannot be replaced by an administrator screen.

## 7.6 Contribution and Remaining Limitations

The principal contribution is not a novel clinical algorithm. It is the integration of explicit boundaries across a working full-stack prototype: backend patient scope, durable notification state, deterministic urgent rules, a versioned retrospective classifier, SHAP behaviour evidence, constrained Groq output and a restricted research area. This integration makes it possible to demonstrate where data came from, which component produced a conclusion and what evidence is still missing.

A second contribution is the documented conversion of failures into controls. CORS and CSP errors exposed deployment assumptions; 401 and 404 responses revealed authentication and route-contract problems; WebSocket lifecycle failures motivated durable-state recovery; test-account pollution exposed weak data lifecycle; and accessibility warnings revealed repeated component defects. Recording these events strengthens the engineering argument because it connects corrective design choices to observed problems rather than presenting the final architecture as inevitable.

The remaining limitations determine the strength of the conclusion. Low precision prevents a claim of acceptable alert burden. ICU-derived data prevent a claim of outpatient or smartwatch generalisation. Small subgroup event counts prevent a fairness conclusion. Automated testing cannot establish clinical comprehension, effectiveness or safety in use. Provider availability, device error, organisational response capacity, backup restoration and incident ownership remain socio-technical dependencies. No single code change can resolve these limitations; they require approved studies, representative data and operational evidence.

## 7.7 Chapter Summary

The results answer the research questions at the level of a software and retrospective research prototype. The system demonstrates enforceable patient boundaries, recoverable notification design, bounded integration of ML and Groq, and transparent research governance. The model shows useful retrospective discrimination but unacceptable potential alert burden, and the population mismatch prevents the intended wearable interpretation. The evidence therefore supports shadow evaluation and further external validation, not autonomous clinical use, demonstrated effectiveness or regulatory approval.

# CHAPTER EIGHT: CONCLUSION AND RECOMMENDATIONS

## 8.1 Conclusion

This dissertation described the design, implementation and evaluation of an AI-assisted Health Risk Dashboard. The final system provides role-based patient monitoring, assigned-patient switching, clinical workflows, durable and live notifications, wearable-shaped integration, deterministic urgent escalation, calibrated retrospective prediction, SHAP evidence, structured Groq assistance, accessibility controls and a restricted research environment. The architecture places PostgreSQL and backend authorisation at the centre, while experimental intelligence remains bounded by safety and governance.

The project also demonstrates the importance of honest evaluation. A ROC-AUC of 0.833 does not erase 3.77% precision, and an implemented usability form does not equal a completed usability study. Related-cohort external validation does not establish smartwatch generalisation. Automated accessibility testing does not replace screen-reader users. Regulatory preparation is not regulatory approval. These distinctions are essential to credible health-informatics research.

## 8.2 Recommendations

The first recommendation is to operate the model in shadow mode and collect pre-specified prospective outcomes under approved governance. Alert burden per 100 patients, false negatives, acknowledgement time and intervention yield should be measured. Threshold changes should be agreed using explicit clinical costs and never optimised on the locked test set.

Second, a licensed representative outpatient or wearable cohort should be imported using the implemented contract. Dataset shift, device groups, missingness, calibration and subgroup performance should be reported before retraining. Patients outside the validated population should receive deterministic monitoring without ML inference.

Third, formal usability and accessibility studies should recruit patients, clinicians and assistive-technology users. Tasks should measure completion, time, errors and confidence, followed by SUS analysis and qualitative feedback. Fourth, staged operational exercises should cover Redis loss, PostgreSQL restart, backup restoration, Groq timeout, duplicate webhooks and multi-instance deduplication. Finally, clinical safety management, data-protection review, provider agreements and regulatory classification should be completed by accountable organisations before any real-care deployment.

## 8.3 Final Statement

The Health Risk Dashboard is a substantial and testable research prototype, not a finished medical product. Its value lies in combining functionality with evidence boundaries: urgent rules remain deterministic, predictions remain governable, AI claims remain traceable, and missing real-world evidence remains explicitly missing. This provides a responsible foundation on which prospective research and clinical assurance can be built.

# REFERENCES

Ancker, J.S., Edwards, A., Nosal, S., Hauser, D., Mauer, E. and Kaushal, R. (2017) ‘Effects of workload, work complexity, and repeated alerts on alert fatigue in a clinical decision support system’, BMC Medical Informatics and Decision Making, 17, 36. Available at: https://doi.org/10.1186/s12911-017-0430-8 (Accessed: 7 August 2026).

Brooke, J. (1996) ‘SUS: a quick and dirty usability scale’, in Jordan, P.W., Thomas, B., McClelland, I.L. and Weerdmeester, B. (eds.) Usability Evaluation in Industry. London: Taylor & Francis.

Collins, G.S. et al. (2024) ‘TRIPOD+AI statement: updated guidance for reporting clinical prediction models that use regression or machine learning methods’, BMJ, 385, e078378. Available at: https://doi.org/10.1136/bmj-2023-078378 (Accessed: 7 August 2026).

Dunn, J., Runge, R. and Snyder, M. (2018) ‘Wearables and the medical revolution’, Personalized Medicine, 15(5), pp. 429–448. Available at: https://doi.org/10.2217/pme-2018-0044 (Accessed: 7 August 2026).

FDA, Health Canada and MHRA (2021) Good Machine Learning Practice for Medical Device Development: Guiding Principles. Available at: https://www.fda.gov/medical-devices/software-medical-device-samd/good-machine-learning-practice-medical-device-development-guiding-principles (Accessed: 7 August 2026).

Goldberger, A.L. et al. (2000) ‘PhysioBank, PhysioToolkit, and PhysioNet: components of a new research resource for complex physiologic signals’, Circulation, 101(23), pp. e215–e220. Available at: https://doi.org/10.1161/01.CIR.101.23.e215 (Accessed: 7 August 2026).

Ghassemi, M., Oakden-Rayner, L. and Beam, A.L. (2021) ‘The false hope of current approaches to explainable artificial intelligence in health care’, The Lancet Digital Health, 3(11), pp. e745–e750. Available at: https://doi.org/10.1016/S2589-7500(21)00208-9 (Accessed: 19 August 2026).

HL7 International (2019) FHIR Release 4. Available at: https://hl7.org/fhir/R4/ (Accessed: 7 August 2026).

Kelly, C.J., Karthikesalingam, A., Suleyman, M., Corrado, G. and King, D. (2019) ‘Key challenges for delivering clinical impact with artificial intelligence’, BMC Medicine, 17, 195. Available at: https://doi.org/10.1186/s12916-019-1426-2 (Accessed: 7 August 2026).

Lee, P., Bubeck, S. and Petro, J. (2023) ‘Benefits, limits, and risks of GPT-4 as an AI chatbot for medicine’, New England Journal of Medicine, 388(13), pp. 1233–1239. Available at: https://doi.org/10.1056/NEJMsr2214184 (Accessed: 19 August 2026).

Liu, X. et al. (2020) ‘Reporting guidelines for clinical trial reports for interventions involving artificial intelligence: the CONSORT-AI extension’, BMJ, 370, m3164. Available at: https://doi.org/10.1136/bmj.m3164 (Accessed: 7 August 2026).

Lundberg, S.M. and Lee, S.-I. (2017) ‘A unified approach to interpreting model predictions’, Advances in Neural Information Processing Systems, 30. Available at: https://proceedings.neurips.cc/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html (Accessed: 7 August 2026).

Lu, J.K., Sijm, M., Janssens, G.E., Goh, J. and Maier, A.B. (2023) ‘Remote monitoring technologies for measuring cardiovascular functions in community-dwelling adults: a systematic review’, GeroScience, 45(5), pp. 2939–2950. Available at: https://doi.org/10.1007/s11357-023-00815-4 (Accessed: 19 August 2026).

MHRA (2024) Software and AI as a Medical Device Change Programme. Medicines and Healthcare products Regulatory Agency. Available at: https://www.gov.uk/government/publications/software-and-ai-as-a-medical-device-change-programme (Accessed: 19 August 2026).

Niculescu-Mizil, A. and Caruana, R. (2005) ‘Predicting good probabilities with supervised learning’, Proceedings of the 22nd International Conference on Machine Learning, pp. 625–632.

Nielsen, J. (1994) Usability Engineering. San Francisco: Morgan Kaufmann.

Noah, B. et al. (2018) ‘Impact of remote patient monitoring on clinical outcomes: an updated meta-analysis of randomized controlled trials’, npj Digital Medicine, 1, 20172. Available at: https://doi.org/10.1038/s41746-017-0002-4 (Accessed: 7 August 2026).

Rajkomar, A., Dean, J. and Kohane, I. (2019) ‘Machine learning in medicine’, New England Journal of Medicine, 380, pp. 1347–1358. Available at: https://doi.org/10.1056/NEJMra1814259 (Accessed: 7 August 2026).

Singhal, K. et al. (2023) ‘Large language models encode clinical knowledge’, Nature, 620, pp. 172–180. Available at: https://doi.org/10.1038/s41586-023-06291-2 (Accessed: 19 August 2026).

Silva, I. et al. (2012) ‘Predicting in-hospital mortality of ICU patients: the PhysioNet/Computing in Cardiology Challenge 2012’, Computing in Cardiology, 39, pp. 245–248. Available at: https://physionet.org/content/challenge-2012/1.0.0/ (Accessed: 7 August 2026).

Tabassi, E. (2023) Artificial Intelligence Risk Management Framework (AI RMF 1.0). NIST AI 100-1. Gaithersburg, MD: National Institute of Standards and Technology. Available at: https://doi.org/10.6028/NIST.AI.100-1 (Accessed: 7 August 2026).

Topol, E. (2019) Deep Medicine: How Artificial Intelligence Can Make Healthcare Human Again. New York: Basic Books.

Vasey, B. et al. (2022) ‘Reporting guideline for the early-stage clinical evaluation of decision support systems driven by artificial intelligence: DECIDE-AI’, BMJ, 377, e070904. Available at: https://doi.org/10.1136/bmj-2022-070904 (Accessed: 19 August 2026).

W3C (2024) Web Content Accessibility Guidelines (WCAG) 2.2. W3C Recommendation, 12 December. Available at: https://www.w3.org/TR/WCAG22/ (Accessed: 7 August 2026).

Wiens, J. et al. (2019) ‘Do no harm: a roadmap for responsible machine learning for health care’, Nature Medicine, 25, pp. 1337–1340. Available at: https://doi.org/10.1038/s41591-019-0548-6 (Accessed: 7 August 2026).

World Health Organization (2021) Ethics and Governance of Artificial Intelligence for Health. Geneva: World Health Organization. Available at: https://www.who.int/publications/i/item/9789240029200 (Accessed: 7 August 2026).

# APPENDIX A: REPRODUCIBILITY CHECKLIST

- Record the source-code commit, deployment build identifiers and Alembic revision.
- Record the model version, dataset name, source URL, SHA-256 hash and outcome definition.
- Preserve the locked internal and external metrics, confusion matrices, calibration and fairness exports.
- Record environment configuration names without exporting secret values.
- Run backend tests, frontend build, lint, browser tests and accessibility checks.
- Verify deterministic critical override, shadow mode, drift suspension and assistant safe fallback.
- Conduct backup restoration and managed-service outage exercises in staging.
- Do not describe human, prospective, effectiveness or regulatory evidence as complete until the corresponding approved activity has occurred.
