# Groq AI setup

AI is deliberately disabled unless both configuration controls are present:

```text
AI_ENABLED=true
GROQ_API_KEY=gsk_...
AI_MODEL=llama-3.1-8b-instant
AI_TIMEOUT_SECONDS=12
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
  "provider_key_present": true,
  "model": "llama-3.1-8b-instant"
}
```

Keep `AI_ENABLED=false` for production health data until the AI privacy,
provider-contract, clinical evaluation, and human-approval gates in
`DEPLOYMENT_CHECKLIST.md` are complete.

Do not put the Groq key in frontend/Vercel variables. It belongs only in the
backend secret manager.
