# Application and research separation

```text
Patient/clinician application
    Monitoring | Alerts | Care workflows | Evidence-bound AI assistant

Restricted admin/research workspace (/admin/research)
    Model evaluation | Global SHAP | Shadow validation
    Usability/SUS | Prospective outcomes | Effectiveness evidence | Exports

Offline research pipeline (backend/scripts)
    Dataset preparation | Outpatient cohort validation | Model training
    External validation | Dissertation figure generation
```

Research records use pseudonymous participant codes and are restricted to administrators. Clinical patient records are not exported by the research evidence endpoint. Consent and an ethics reference are mandatory before a usability session can be stored.

## Outpatient dataset decision

No openly downloadable smartwatch dataset currently included in this repository contains all required signals plus the genuine six-hour critical-vital outcome used by the installed model. Substituting a convenient activity dataset would create invalid validation evidence.

`backend/scripts/import_outpatient_cohort.py` therefore enforces the compatible contract, records licensing and provenance, rejects non-longitudinal cohorts, and never invents missing labels. A qualifying cohort must be lawfully obtained through an approved data-access process before the import is run. If a cohort uses admission within seven days or another outcome, the intended outcome, model and validation protocol must be changed and versioned before training.
