# Complete test inventory

Source inventory at commit 3ec4d92. Extracted 8 October 2026; tests were not rerun. Backend entries are test functions, not expanded parametrized cases. The September 14 report records 111 backend passes; current source also includes later database-configuration tests.

## test_assistant_safety.py (9 functions)

- [test_critical_vitals_activate_deterministic_emergency](../../backend/tests/test_assistant_safety.py#L55)
- [test_emergency_symptoms_bypass_provider_without_vitals](../../backend/tests/test_assistant_safety.py#L70)
- [test_missing_and_stale_data_are_explicit](../../backend/tests/test_assistant_safety.py#L78)
- [test_conflicting_readings_require_repeat_measurement](../../backend/tests/test_assistant_safety.py#L86)
- [test_fabricated_evidence_is_rejected](../../backend/tests/test_assistant_safety.py#L99)
- [test_medication_evidence_must_reference_controlled_tool_record](../../backend/tests/test_assistant_safety.py#L122)
- [test_ai_cannot_change_evidence_timestamp](../../backend/tests/test_assistant_safety.py#L157)
- [test_provider_cannot_create_critical_escalation_or_unsupported_confidence](../../backend/tests/test_assistant_safety.py#L168)
- [test_prompt_injection_in_record_remains_untrusted_data](../../backend/tests/test_assistant_safety.py#L177)

## test_backup_crypto.py (1 functions)

- [test_backup_encryption_round_trip_is_authenticated_and_streaming](../../backend/tests/test_backup_crypto.py#L6)

## test_baseline_service.py (7 functions)

- [test_fewer_than_minimum_prior_samples_is_not_ready](../../backend/tests/test_baseline_service.py#L84)
- [test_normal_current_reading_has_small_patient_relative_deviation](../../backend/tests/test_baseline_service.py#L100)
- [test_large_heart_rate_deviation_has_large_positive_z_score](../../backend/tests/test_baseline_service.py#L119)
- [test_same_current_value_is_more_abnormal_for_lower_baseline_patient](../../backend/tests/test_baseline_service.py#L136)
- [test_single_sensor_outlier_does_not_shift_baseline_mean](../../backend/tests/test_baseline_service.py#L164)
- [test_only_most_recent_observation_window_is_used](../../backend/tests/test_baseline_service.py#L184)
- [test_non_resting_and_invalid_timestamp_records_are_excluded](../../backend/tests/test_baseline_service.py#L200)

## test_database_config.py (2 functions)

- [test_aiven_postgres_alias_is_normalized_for_sqlalchemy](../../backend/tests/test_database_config.py#L4)
- [test_postgresql_driver_url_is_not_changed](../../backend/tests/test_database_config.py#L11)

## test_early_warning.py (3 functions)

- [test_critical_and_developing_trend_detection](../../backend/tests/test_early_warning.py#L26)
- [test_patient_specific_threshold_and_data_quality_are_explicit](../../backend/tests/test_early_warning.py#L38)
- [test_urgent_alert_is_deduplicated_and_only_assigned_clinician_is_notified](../../backend/tests/test_early_warning.py#L50)

## test_evaluation_experiments.py (12 functions)

- [test_scenario_outcomes_cover_every_named_fixture_without_model](../../backend/tests/test_evaluation_experiments.py#L9)
- [test_personalization_interprets_same_value_relative_to_patient](../../backend/tests/test_evaluation_experiments.py#L27)
- [test_persistence_records_duplicate_alert_updates_without_duplicate_cases](../../backend/tests/test_evaluation_experiments.py#L36)
- [test_combined_signal_has_stronger_patient_relative_result](../../backend/tests/test_evaluation_experiments.py#L44)
- [test_every_deterministic_critical_override_passes](../../backend/tests/test_evaluation_experiments.py#L52)
- [test_shadow_mode_stores_evidence_without_review_case](../../backend/tests/test_evaluation_experiments.py#L63)
- [test_canonical_risk_is_independent_of_groq](../../backend/tests/test_evaluation_experiments.py#L72)
- [test_security_boundary_denies_outsider_and_pseudonymizes_ai_context](../../backend/tests/test_evaluation_experiments.py#L80)
- [test_false_alert_rate_uses_normal_synthetic_sequences](../../backend/tests/test_evaluation_experiments.py#L89)
- [test_attribution_evaluation_calculates_top_k_rates](../../backend/tests/test_evaluation_experiments.py#L98)
- [test_performance_evaluation_reports_all_samples_without_model](../../backend/tests/test_evaluation_experiments.py#L124)
- [test_runner_writes_json_and_csv_evidence](../../backend/tests/test_evaluation_experiments.py#L138)

## test_evaluation_scenarios.py (4 functions)

- [test_all_named_scenarios_are_reproducible_and_chronological](../../backend/tests/test_evaluation_scenarios.py#L8)
- [test_different_seed_changes_normal_noise](../../backend/tests/test_evaluation_scenarios.py#L20)
- [test_injected_scenarios_have_expected_dominant_change](../../backend/tests/test_evaluation_scenarios.py#L26)
- [test_unknown_scenario_and_naive_start_are_rejected](../../backend/tests/test_evaluation_scenarios.py#L35)

## test_integration_hardening.py (4 functions)

- [test_websocket_ticket_is_short_lived_and_route_scoped](../../backend/tests/test_integration_hardening.py#L23)
- [test_websocket_simulator_service_preserves_transport_contract](../../backend/tests/test_integration_hardening.py#L59)
- [test_redis_subscription_failure_returns_to_polling](../../backend/tests/test_integration_hardening.py#L81)
- [test_incomplete_withings_group_records_unavailable_state](../../backend/tests/test_integration_hardening.py#L97)

## test_measurement_ingestion.py (13 functions)

- [test_ingestion_validates_persists_metadata_and_runs_downstream_hooks](../../backend/tests/test_measurement_ingestion.py#L61)
- [test_patient_timestamp_source_duplicate_uses_common_policy](../../backend/tests/test_measurement_ingestion.py#L99)
- [test_external_id_takes_precedence_for_provider_idempotency](../../backend/tests/test_measurement_ingestion.py#L128)
- [test_same_patient_timestamp_is_distinct_for_different_sources](../../backend/tests/test_measurement_ingestion.py#L151)
- [test_common_deduplication_matches_legacy_equivalent_timezone](../../backend/tests/test_measurement_ingestion.py#L165)
- [test_timestamp_is_normalized_to_utc](../../backend/tests/test_measurement_ingestion.py#L188)
- [test_invalid_or_timezone_naive_timestamp_is_rejected](../../backend/tests/test_measurement_ingestion.py#L204)
- [test_diastolic_above_systolic_is_rejected](../../backend/tests/test_measurement_ingestion.py#L213)
- [test_negative_activity_measurements_are_rejected](../../backend/tests/test_measurement_ingestion.py#L231)
- [test_vital_schema_exposes_internal_unit_contract](../../backend/tests/test_measurement_ingestion.py#L240)
- [test_common_schema_validation_rejects_invalid_measurement](../../backend/tests/test_measurement_ingestion.py#L249)
- [test_async_live_hook_is_invoked_by_pipeline_and_can_be_awaited](../../backend/tests/test_measurement_ingestion.py#L260)
- [test_transaction_rolls_back_vital_when_audit_write_fails](../../backend/tests/test_measurement_ingestion.py#L280)

## test_measurement_source_adapters.py (9 functions)

- [test_manual_api_delegates_legacy_dedup_and_audit](../../backend/tests/test_measurement_source_adapters.py#L49)
- [test_csv_uses_manual_endpoint_but_preserves_csv_source](../../backend/tests/test_measurement_source_adapters.py#L67)
- [test_manual_duplicate_remains_http_409](../../backend/tests/test_measurement_source_adapters.py#L82)
- [test_nurse_workflow_delegates_audit_to_ingestion](../../backend/tests/test_measurement_source_adapters.py#L98)
- [test_wearable_adapter_maps_defaults_and_source](../../backend/tests/test_measurement_source_adapters.py#L117)
- [test_wearable_request_uses_existing_common_vital_bounds](../../backend/tests/test_measurement_source_adapters.py#L144)
- [test_simulator_adapter_delegates_patient_update_and_audit](../../backend/tests/test_measurement_source_adapters.py#L157)
- [test_withings_adapter_preserves_external_id_and_live_hook](../../backend/tests/test_measurement_source_adapters.py#L186)
- [test_withings_mapping_reports_missing_fields_without_defaults](../../backend/tests/test_measurement_source_adapters.py#L320)

## test_ml_pipeline.py (4 functions)

- [test_feature_engineering_is_patient_scoped_and_complete](../../backend/tests/test_ml_pipeline.py#L36)
- [test_metrics_include_discrimination_calibration_and_confusion_matrix](../../backend/tests/test_ml_pipeline.py#L44)
- [test_fairness_report_marks_small_subgroups_as_insufficient](../../backend/tests/test_ml_pipeline.py#L54)
- [test_training_writes_versioned_model_and_evaluation](../../backend/tests/test_ml_pipeline.py#L60)

## test_research_evidence.py (2 functions)

- [test_sus_scoring_uses_standard_alternating_formula](../../backend/tests/test_research_evidence.py#L7)
- [test_sus_rejects_incomplete_or_out_of_range_responses](../../backend/tests/test_research_evidence.py#L12)

## test_risk_assessment.py (8 functions)

- [test_spo2_critical_rule_overrides_low_ml_probability](../../backend/tests/test_risk_assessment.py#L138)
- [test_high_heart_rate_is_a_critical_override](../../backend/tests/test_risk_assessment.py#L151)
- [test_baseline_insufficient_is_explicit_and_not_claimed_as_reassurance](../../backend/tests/test_risk_assessment.py#L161)
- [test_stable_patient_with_ready_baseline_is_low](../../backend/tests/test_risk_assessment.py#L173)
- [test_shadow_ml_is_exposed_without_creating_an_alert](../../backend/tests/test_risk_assessment.py#L187)
- [test_policy_is_deterministic_for_identical_database_state](../../backend/tests/test_risk_assessment.py#L225)
- [test_model_unavailable_preserves_baseline_and_safety_assessment](../../backend/tests/test_risk_assessment.py#L235)
- [test_endpoint_reuses_existing_patient_access_control](../../backend/tests/test_risk_assessment.py#L247)

## test_security.py (25 functions)

- [test_notification_read_receipts_are_private_per_user](../../backend/tests/test_security.py#L158)
- [test_complete_role_based_clinical_workflow](../../backend/tests/test_security.py#L219)
- [test_notification_commit_publishes_cross_instance_invalidation](../../backend/tests/test_security.py#L431)
- [test_ai_memory_is_encrypted_and_isolated_by_patient](../../backend/tests/test_security.py#L455)
- [test_admin_only_routes_reject_doctor_and_allow_admin](../../backend/tests/test_security.py#L499)
- [test_registration_request_is_public_but_review_is_admin_only](../../backend/tests/test_security.py#L522)
- [test_patient_assignment_blocks_other_doctors_and_patients](../../backend/tests/test_security.py#L567)
- [test_admin_cannot_read_or_delete_clinical_patient_records](../../backend/tests/test_security.py#L622)
- [test_admin_staff_assignment_grants_and_removes_patient_access](../../backend/tests/test_security.py#L668)
- [test_clinician_actions_use_validated_payloads_and_block_admin](../../backend/tests/test_security.py#L741)
- [test_refresh_tokens_rotate_and_reuse_is_rejected](../../backend/tests/test_security.py#L809)
- [test_direct_registration_is_disabled](../../backend/tests/test_security.py#L832)
- [test_weak_registration_password_is_rejected](../../backend/tests/test_security.py#L845)
- [test_ai_question_uses_post_and_emergency_rule_bypasses_provider](../../backend/tests/test_security.py#L858)
- [test_ai_context_is_pseudonymised](../../backend/tests/test_security.py#L887)
- [test_withings_webhook_verification_and_unknown_notifications_are_safe](../../backend/tests/test_security.py#L903)
- [test_withings_connection_requires_complete_server_configuration](../../backend/tests/test_security.py#L922)
- [test_care_workflows_enforce_assigned_patient_boundaries](../../backend/tests/test_security.py#L940)
- [test_secure_messages_require_an_active_care_relationship](../../backend/tests/test_security.py#L978)
- [test_only_signed_shared_documents_are_visible_to_patients](../../backend/tests/test_security.py#L1016)
- [test_patient_controls_consent_and_can_export_only_own_record](../../backend/tests/test_security.py#L1059)
- [test_totp_mfa_secret_is_encrypted_and_requires_confirmation](../../backend/tests/test_security.py#L1102)
- [test_admin_password_reset_link_is_single_use_and_revokes_sessions](../../backend/tests/test_security.py#L1125)
- [test_patient_creation_handles_multiple_active_nurses](../../backend/tests/test_security.py#L1154)
- [test_complete_extended_care_workspace_workflow](../../backend/tests/test_security.py#L1175)

## Browser tests (19 expanded cases)

### [accessibility.spec.ts](../../frontend/tests/e2e/accessibility.spec.ts)

- `${path} has no serious automated accessibility violations`
- "keyboard users can skip directly to main content"
- "reduced-motion preference disables nonessential animation"
- "login remains usable at 200 percent zoom"

### [csv-upload.spec.ts](../../frontend/tests/e2e/csv-upload.spec.ts)

- `${rowCount}-row CSV previews at most five rows and uploads all rows`

### [smoke.spec.ts](../../frontend/tests/e2e/smoke.spec.ts)

- "login page renders the public access workflow"
- "password visibility toggle works on login and register"
- "invalid login shows a useful error message"
- "core pages avoid horizontal overflow on common device widths"
- "authenticated app shell fits phone and tablet widths"
- "all four roles receive the correct protected workspace navigation"
- "admin navigation highlights exactly one current section"
- "assigned clinicians can switch patients and the selection persists"
- "an expired session refreshes once and redirects cleanly when renewal fails"
- "admin can reach protected admin workspace"
- "notification bell moves read items into persistent history"

Accessibility path expands to /login and /register. CSV rowCount expands to 3, 5 and 20. The admin workspace test is conditional on E2E_RUN_AUTH=1 and requires a running backend and seeded account. Historical result: 18 passed, 1 skipped.

## Synthetic evaluation scenarios

normal_stable, single_spike, persistent_hr_increase, falling_spo2, bp_spike, combined_hr_spo2, reduced_activity, gradual_drift.

Evaluation experiments cover scenario outcomes, baseline personalization, persistence/deduplication, combined signals, critical overrides, shadow mode, Groq independence, security boundaries, false alerts, attribution and latency. [Generated evidence](../dissertation-evidence/evaluation/README.md).

## Reports and execution configuration

- [LOCAL_POSTGRESQL.md](LOCAL_POSTGRESQL.md)
- [PHASE_6_INFRASTRUCTURE_REPORT.md](PHASE_6_INFRASTRUCTURE_REPORT.md)
- [PHASE_7_INTEGRATION_HARDENING_REPORT.md](PHASE_7_INTEGRATION_HARDENING_REPORT.md)
- [PHASE_8_DEPLOYMENT_EVIDENCE_REPORT.md](PHASE_8_DEPLOYMENT_EVIDENCE_REPORT.md)
- [PRODUCT_TEST_REPORT.md](PRODUCT_TEST_REPORT.md)
- [PostgreSQL execution script](../../scripts/test-postgresql.ps1)
- [Disposable database configuration](../../compose.test.yml)
- [CI workflow](../../.github/workflows/ci.yml)
- [Playwright configuration](../../frontend/playwright.config.ts)
- [Evaluation entry point](../../backend/evaluation_suite/__main__.py)
- [Production smoke runner](../../scripts/production_smoke.py)

## Reproduction

From the repository root:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-postgresql.ps1
```
From frontend:
```powershell
npm.cmd ci
npm.cmd audit --audit-level=high
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e -- --project=chromium
```
From backend:
```powershell
python -m evaluation_suite --seed 20260911 --performance-iterations 30 --output ../evaluation-rerun
```
