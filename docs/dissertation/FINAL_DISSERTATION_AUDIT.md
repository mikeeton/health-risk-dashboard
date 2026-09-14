# Final Dissertation Audit

Date: 19 August 2026

## 1. Chapter-by-chapter changes

### Chapter One — Introduction

The top-down progression, problem statement, research questions, aim, objectives, scope and explicit research boundaries were retained. The chapter already separated the software prototype from medical-device approval and clinical effectiveness, so no stronger claim was introduced.

### Chapter Two — Literature Review

The thematic structure was retained and strengthened with recent, verified work on community remote monitoring, explainability limitations, clinical large language models, early-stage clinical AI evaluation and current UK regulatory change. New material compares capability with limitations and states how each theme affected the design. The review now makes clearer that reporting guidelines do not themselves constitute validation.

### Chapter Three — Requirements Analysis and Methodology

The principal technical correction concerns model selection. The dissertation now matches `backend/scripts/train_ml_models.py`: candidate selection uses validation ROC-AUC, with F1 as a tie-breaker. Sensitivity is used later during operating-threshold selection, where candidate thresholds must achieve sensitivity of at least 0.70 before Youden's J is maximised. Calibration, Isolation Forest and Set B evaluation are also described as separate stages.

### Chapter Four — System Analysis and Design

The layered architecture, trust boundaries, data flow, AI evidence boundary, deployment topology and threat model were retained. Captions and surrounding explanations were checked for purpose, provenance and interpretation.

### Chapter Five — System Implementation

The implementation chapter retains genuine project screenshots and the documented problems encountered. Figure numbers were corrected from the non-sequential “5.5a” pattern to Figures 5.1–5.9. The chapter continues to distinguish trained ML, the Groq LLM, deterministic safety rules, calculated indicators and synthetic demonstration data.

### Chapter Six — Testing and Evaluation

Two artifact-derived charts were added: candidate-model validation comparison and internal-versus-Set-B metric comparison. The section now explicitly explains why logistic regression was selected, why no candidate is uniformly superior across every metric, and why related-cohort Set B results do not establish smartwatch generalisation. An evidence-maturity table distinguishes implemented, tested, retrospectively evaluated and outstanding work. SHAP interpretation is explicitly non-causal.

### Chapter Seven — Results and Discussion

The chapter was substantially deepened and organised around the four research questions. Chapter Six now reports what happened, while Chapter Seven explains why the results matter, why the model produced its observed error pattern, how the findings relate to the literature, and what the limitations permit the project to claim. It analyses prevalence, threshold selection, false-positive burden, calibration, population mismatch, access-control boundaries, AI evidence validation, usability evidence and governance maturity.

### Chapter Eight — Conclusion and Recommendations

The conclusion continues to answer the research purpose while separating software completion from clinical evidence. Future work remains linked to observed limitations: representative validation, prospective shadow evaluation, alert-burden measurement, approved usability/accessibility studies and operational exercises.

## 2. Structural changes

- Retained the eight-chapter organisation because it provides a clear distinction between implementation, testing and critical discussion.
- Added a List of Figures and a List of Tables to the front matter.
- Retained a static table of contents suitable for deterministic headless rendering.
- Preserved the declaration, acknowledgements, abstract, abbreviations, references and reproducibility appendix.

## 3. Writing improvements

- Replaced the incorrect sensitivity-based model-selection explanation with the code-accurate rule.
- Added recent synthesis without turning the literature review into a paper-by-paper catalogue.
- Strengthened qualifying language around external validation, SHAP, LLM capability and regulation.
- Interpreted charts and metrics instead of leaving them as unexplained outputs.
- Preserved clear final-year undergraduate English and avoided inflated claims.

## 4. Technical corrections

- Verified all reported ML values against `backend/artifacts/ml/evaluation.json`.
- Verified the selection and threshold algorithms against `backend/scripts/train_ml_models.py`.
- Corrected Figure 5.5a and all subsequent Chapter Five figure numbers.
- Added artifact-derived candidate and cohort comparison plots.
- Clarified that sigmoid calibration follows candidate selection and that Set B evaluation did not retrain the model.
- Clarified that Isolation Forest is a separate anomaly signal, not the six-hour supervised classifier.
- Corrected model rollback wording to active-version enforcement because only one committed artifact exists.
- Corrected Withings security wording: the webhook uses known-connection lookup, OAuth-backed provider retrieval and deduplication, but no separate cryptographic webhook-signature verification was found.
- Corrected the Groq daily limit from a cost boundary to a request-count boundary.
- Qualified backup and deployment claims so infrastructure is not presented as successful production operation.

## 5. New references added

Six verified sources were added: Ghassemi et al. (2021), Vasey et al. (2022), Lee, Bubeck and Petro (2023), Lu et al. (2023), Singhal et al. (2023), and MHRA (2024). Full reasons, DOIs and official URLs are recorded in `REFERENCE_AUDIT.md`.

## 6. Old references retained

All 20 existing references were retained. Older sources remain where they are foundational, define a dataset or method, or provide an authoritative standard. Retention decisions are itemised in `REFERENCE_AUDIT.md`.

## 7. References removed or corrected

No reference was removed and no bibliographic identity was materially corrected. The audit found no basis for inventing or silently replacing a source.

## 8. Figures added or replaced

- Added Figure 6.1, candidate-model validation comparison, generated directly from `candidate_validation` in `evaluation.json`.
- Added Figure 6.4, internal test versus external Set B comparison, generated directly from the committed evaluation artifact.
- Regenerated all existing author-created diagrams and evaluation charts at high resolution.
- Retained actual application screenshots; no synthetic screenshot was generated.

## 9. Tables added or replaced

- Retained Tables 3.1, 4.1, 4.2, 6.1 and 6.2.
- Added Table 6.3 to show evidence maturity and the conclusions that the current evidence permits.
- Added a static List of Tables in the front matter.

## 10. Remaining limitations

- Internal precision remains 0.0377, creating a severe potential false-positive and alert-fatigue burden.
- Set B is a related ICU challenge cohort, not a representative outpatient or smartwatch population.
- No completed human usability study or assistive-technology user evaluation exists.
- No prospective clinical validation or demonstrated clinical effectiveness exists.
- Fairness estimates are retrospective and some positive subgroup counts are small.
- Production outage and restoration procedures need repeated staging exercises under realistic load.
- The project has no regulatory approval or conformity assessment.

## 11. Claims requiring author verification

- The title page currently states the author's name and submission month but not the university, programme, student number, supervisor or exact award. These details must be supplied from official university requirements rather than guessed.
- The declaration wording should be checked against the university's required authorship and permitted-tool statement.
- The reported final verification counts should be rerun immediately before submission if source code changes after this audit.
- The author should confirm that every retained interface screenshot contains only approved synthetic/demo information.

## 12. Formatting issues requiring Microsoft Word

- No unresolved placeholder text remains.
- The document uses A4 pages, a 1.5-inch binding margin, 1-inch remaining margins, Times New Roman body text, 1.5 line spacing and chapter-based headings.
- The static table of contents and illustration lists are correct for the audited version. If text is added in Word, page references should be rechecked before submission.
- University-specific title-page, declaration, binding and submission rules still require manual confirmation.

## 13. Current word and page count

- Source word count, including references and appendix: 13,300.
- Abstract: 246 words.
- Rendered document: 63 physical pages, comprising eight Roman-numbered front-matter pages and 55 Arabic-numbered main-matter pages.
- Figures: 19.
- Numbered content tables: 6.

## 14. Disagreement between dissertation and current code

The material disagreements found during this revision were corrected. These included the earlier sensitivity-based model-selection explanation, an overstatement of model rollback, wording that could imply cryptographic Withings webhook validation, a cost-limit description for what is a daily request limit, and infrastructure wording that could be read as proof of completed production backup/deployment exercises. The detailed comparison is recorded in `CLAIMS_VS_CODE_AUDIT.md`. No remaining contradiction was identified in the audited ML metrics, model version, split sizes, threshold, outcome, calibration method or Set B interpretation. Time-sensitive verification counts and deployment descriptions must be rechecked if the repository or hosting configuration changes after 19 August 2026.

## Final quality-control result

The final DOCX was rendered to PDF and 63 page images. Eight contact sheets covering every page were visually inspected, and every page containing a figure was also checked at full rendered page size. The architecture figure was resized so Table 4.1 remained together instead of leaving one continuation row on the next page. No clipped text, overlapping objects, unreadable figure labels, broken margins or blank unexpected pages were observed. The document audit found 19 inline images with alternative descriptions, 17 Heading 1 paragraphs, 61 Heading 2 paragraphs and two consistent portrait A4 sections. The automated DOCX accessibility audit returned zero high-, medium- or low-severity findings.
