# Groq AI setup

AI is deliberately disabled unless both configuration controls are present:

```text
AI_ENABLED=true
GROQ_API_KEY=gsk_...
AI_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_SECONDS=12
AI_MAX_RETRIES=2
AI_MAX_TOKENS=1200
AI_DAILY_REQUEST_LIMIT=500
AI_CIRCUIT_FAILURE_THRESHOLD=3
AI_CIRCUIT_RESET_SECONDS=60
AI_DATA_STALE_HOURS=24
AI_MEMORY_ENCRYPTION_KEY=<Fernet key from the production secret manager>
AI_DATA_CLASSIFICATION=synthetic
```

After setting them, restart the backend. An authenticated user can verify
configuration without exposing the key:

```text
GET /assistant/configuration
```

Expected response:

```json
{
  "enabled": true,
  "model": "llama-3.1-8b-instant",
  "prompt_version": "clinical-assistant-v3-evidence",
  "governance_ready": true,
  "memory_encrypted": true
}
```

For real patient data set `AI_DATA_CLASSIFICATION=real`. The backend then
fails closed unless every governance gate below is explicitly true:

```text
AI_PROVIDER_DPA_APPROVED=true
AI_RETENTION_REVIEWED=true
AI_REGIONAL_PROCESSING_APPROVED=true
AI_AUDIT_ENABLED=true
AI_CLINICAL_APPROVAL=true
```

These flags record approvals; they do not replace the underlying signed
provider agreement, retention configuration, regional-processing review,
audit policy, or clinical safety sign-off. Keep `AI_ENABLED=false` until those
artifacts and the reviewed clinical evaluation suite are complete.

The assistant now uses controlled database retrieval, pseudonymous patient
references, encrypted patient/user-scoped memory, strict response validation,
evidence-ID validation, deterministic emergency rules, bounded retries,
timeouts, a circuit breaker, and deterministic provider fallbacks. Run:

```text
backend\venv\Scripts\python.exe -m pytest backend\tests\test_assistant_safety.py -q
```

Do not put the Groq key in frontend/Vercel variables. It belongs only in the
backend secret manager.
