from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import os
from dotenv import load_dotenv
from groq import Groq

import models
from access_control import get_accessible_patient
from auth_utils import get_current_user
from database import get_db

load_dotenv()

router = APIRouter(
    prefix="/assistant",
    tags=["AI Assistant"]
)

_groq_client: Groq | None = None


def get_groq_client() -> Groq | None:
    """Create the Groq client only when an API key is configured.

    Render imports every route module while starting Uvicorn. Constructing the
    Groq client at import time makes the whole backend fail when `GROQ_API_KEY`
    is not set, even though the rest of the application can run without AI.
    """

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        return None

    global _groq_client

    if _groq_client is None:
        _groq_client = Groq(api_key=api_key)

    return _groq_client

# =========================
# FALLBACK MODELS
# =========================

GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "meta-llama/llama-4-scout-17b-16e-instruct"
]

# =========================
# PATIENT CONTEXT
# =========================

def build_patient_context(patient_id: int, db: Session):

    patient = (
        db.query(models.Patient)
        .filter(models.Patient.id == patient_id)
        .first()
    )

    if not patient:
        return None

    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.patient_id == patient_id)
        .order_by(models.Vital.id.desc())
        .limit(5)
        .all()
    )

    medications = []
    if hasattr(models, "Medication"):
        medications = (
            db.query(models.Medication)
            .filter(models.Medication.patient_id == patient_id)
            .all()
        )

    events = []
    if hasattr(models, "PatientEvent"):
        events = (
            db.query(models.PatientEvent)
            .filter(models.PatientEvent.patient_id == patient_id)
            .order_by(models.PatientEvent.id.desc())
            .limit(5)
            .all()
        )

    vitals_text = "\n".join([
        (
            f"- HR {v.heart_rate}, "
            f"SpO2 {v.spo2}, "
            f"BP {v.systolic_bp}/{v.diastolic_bp}, "
            f"sleep {v.sleep_hours}h, "
            f"risk {v.risk_score}/10"
        )
        for v in vitals
    ])

    meds_text = "\n".join([
        (
            f"- {m.name} {m.dosage}, "
            f"status {m.status}"
        )
        for m in medications
    ])

    events_text = "\n".join([
        (
            f"- {e.event_type}: {e.title}"
        )
        for e in events
    ])

    return f"""
PATIENT
Name: {patient.name}
Age: {patient.age}
Condition: {patient.condition}
Risk Level: {patient.risk_level}

VITALS
{vitals_text or "No vitals."}

MEDICATIONS
{meds_text or "No medications."}

EVENTS
{events_text or "No events."}
""".strip()

# =========================
# GROQ AI
# =========================

def ask_groq(prompt: str):
    client = get_groq_client()

    if client is None:
        return {
            "model": "not-configured",
            "answer": (
                "AI assistant is not configured. Set GROQ_API_KEY in the "
                "backend environment to enable AI summaries and Q&A."
            ),
        }

    last_error = None

    for model in GROQ_MODELS:

        try:

            print(f"Trying model: {model}")

            response = client.chat.completions.create(
                model=model,
                temperature=0.2,
                max_tokens=400,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a professional clinical AI assistant. "
                            "Be concise, professional, medically safe, and neutral. "
                            "Never use jokes, slang, or casual language. "
                            "Do not diagnose or prescribe."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            return {
                "model": model,
                "answer": response.choices[0].message.content
            }

        except Exception as error:

            print(f"{model} failed.")
            print(error)

            last_error = str(error)

            continue

    return {
        "model": "none",
        "answer": f"All Groq models failed. Last error: {last_error}"
    }


def assistant_role_context(current_user: models.User) -> str:
    role = (current_user.role or "").lower()

    if role == "patient":
        return (
            "You are speaking to the patient. Use clear, reassuring, non-technical "
            "language. Explain what the readings may mean without diagnosing, "
            "prescribing, or replacing a clinician. Encourage contacting the care "
            "team for urgent or worrying symptoms."
        )

    if role == "nurse":
        return (
            "You are speaking to a nurse. Focus on monitoring priorities, "
            "medication adherence, escalation triggers, care-team communication, "
            "and practical bedside or remote-care actions within nursing scope."
        )

    return (
        "You are speaking to a doctor/clinician. Use concise clinical language, "
        "highlight abnormal vitals, risk drivers, differential concerns, review "
        "priorities, and safe next checks without giving definitive diagnosis."
    )


def summary_instruction(current_user: models.User) -> str:
    role = (current_user.role or "").lower()

    if role == "patient":
        return """
Generate a patient-friendly health overview.

Include:
- Simple risk level
- What the latest readings suggest
- What looks stable
- What to watch for
- Questions to ask the care team
- Safety note
"""

    if role == "nurse":
        return """
Generate a nursing monitoring summary.

Include:
- Current risk level
- Vital sign concerns
- Medication adherence concerns
- Monitoring priorities
- Escalation triggers
- Care-team update note
"""

    return """
Generate a clinician summary.

Include:
- Patient overview
- Key abnormal vitals
- Medication adherence concerns
- Timeline observations
- Risk explanation
- Recommended checks
- Safety note
"""

# =========================
# PATIENT SUMMARY
# =========================

@router.get("/patient-summary/{patient_id}")
def patient_summary(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)

    context = build_patient_context(patient_id, db)

    if not context:
        return {
            "message": "Patient not found."
        }

    prompt = f"""
{assistant_role_context(current_user)}

{summary_instruction(current_user)}
Patient Data:
{context}
"""

    result = ask_groq(prompt)

    return {
        "patient_id": patient_id,
        "model_used": result["model"],
        "summary": result["answer"]
    }

# =========================
# ASK AI
# =========================

@router.get("/ask/{patient_id}")
def ask_ai(
    patient_id: int,
    question: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)

    context = build_patient_context(patient_id, db)

    if not context:
        return {
            "answer": "Patient not found."
        }

    prompt = f"""
{assistant_role_context(current_user)}

Patient Data:
{context}

Question:
{question}
"""

    result = ask_groq(prompt)

    return {
        "model_used": result["model"],
        "question": question,
        "answer": result["answer"]
    }

# =========================
# HANDOVER
# =========================

@router.get("/handover/{patient_id}")
def handover(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_accessible_patient(db, patient_id, current_user)

    context = build_patient_context(patient_id, db)

    if not context:
        return {
            "message": "Patient not found."
        }

    prompt = f"""
{assistant_role_context(current_user)}

Generate a clinician SBAR handover.

Include:
- Situation
- Background
- Assessment
- Recommendation
- Safety note

Patient Data:
{context}
"""

    result = ask_groq(prompt)

    return {
        "patient_id": patient_id,
        "model_used": result["model"],
        "handover": result["answer"]
    }
