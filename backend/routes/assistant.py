import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Query
from google import genai
from sqlalchemy.orm import Session

import models
from database import get_db

load_dotenv()

router = APIRouter(
    prefix="/assistant",
    tags=["AI Assistant"]
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

client = genai.Client(api_key=GEMINI_API_KEY)


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
        .limit(15)
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
            .limit(10)
            .all()
        )

    review_cases = []
    if hasattr(models, "ReviewCase"):
        review_cases = (
            db.query(models.ReviewCase)
            .filter(models.ReviewCase.patient_id == patient_id)
            .order_by(models.ReviewCase.id.desc())
            .limit(5)
            .all()
        )

    vitals_text = "\n".join(
        [
            (
                f"- {v.timestamp}: HR {v.heart_rate}, SpO2 {v.spo2}, "
                f"BP {v.systolic_bp}/{v.diastolic_bp}, sleep {v.sleep_hours}h, "
                f"risk {v.risk_score}/10, activity {v.activity_state}"
            )
            for v in vitals
        ]
    )

    medications_text = "\n".join(
        [
            (
                f"- {m.name} {m.dosage}, scheduled {m.schedule_time}, "
                f"status {m.status}, notes {m.notes or 'none'}"
            )
            for m in medications
        ]
    )

    events_text = "\n".join(
        [
            (
                f"- {e.timestamp}: {e.event_type} - {e.title}. "
                f"{e.description or ''}"
            )
            for e in events
        ]
    )

    review_cases_text = "\n".join(
        [
            (
                f"- Case #{case.id}: {case.risk_level}, score {case.risk_score}, "
                f"status {case.status}, note {case.note or 'none'}"
            )
            for case in review_cases
        ]
    )

    return f"""
PATIENT PROFILE
Name: {patient.name}
Age: {patient.age}
Condition: {patient.condition}
Recorded Risk Level: {patient.risk_level}
Last Checkup: {patient.last_checkup}

RECENT VITALS
{vitals_text or "No vitals available."}

MEDICATION ADHERENCE
{medications_text or "No medication records available."}

TIMELINE EVENTS
{events_text or "No timeline events available."}

REVIEW CASES
{review_cases_text or "No review cases available."}
""".strip()


def call_gemini(patient_context: str, question: str):
    if not GEMINI_API_KEY:
        return (
            "Gemini API key is missing. Add GEMINI_API_KEY to backend/.env "
            "and restart the FastAPI server."
        )

    prompt = f"""
You are an AI clinical decision-support assistant inside a university healthcare software project.

Important rules:
- Use only the provided patient data.
- Do not invent facts.
- Do not diagnose.
- Do not prescribe medication.
- Give practical clinical workflow support.
- Explain risk factors clearly.
- Include suggested checks or escalation steps where appropriate.
- Always include a short safety note that this does not replace clinician judgement.

Patient data:
{patient_context}

User question:
{question}

Answer in a clear clinician-friendly style with headings where useful.
""".strip()

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        return response.text

    except Exception as error:
        return f"Gemini request failed: {str(error)}"


@router.get("/patient-summary/{patient_id}")
def patient_summary(
    patient_id: int,
    db: Session = Depends(get_db)
):
    context = build_patient_context(patient_id, db)

    if not context:
        return {
            "message": "Patient not found."
        }

    answer = call_gemini(
        context,
        (
            "Generate a concise clinician summary including patient summary, "
            "vital trends, medication adherence, timeline events, review cases, "
            "risk factors, and recommended next checks."
        )
    )

    return {
        "patient_id": patient_id,
        "summary": answer,
    }


@router.get("/ask/{patient_id}")
def ask_ai(
    patient_id: int,
    question: str = Query(...),
    db: Session = Depends(get_db),
):
    context = build_patient_context(patient_id, db)

    if not context:
        return {
            "question": question,
            "answer": "Patient not found.",
        }

    answer = call_gemini(context, question)

    return {
        "question": question,
        "answer": answer,
    }


@router.get("/handover/{patient_id}")
def generate_handover(
    patient_id: int,
    db: Session = Depends(get_db),
):
    context = build_patient_context(patient_id, db)

    if not context:
        return {
            "message": "Patient not found."
        }

    answer = call_gemini(
        context,
        (
            "Create a structured clinician shift handover using SBAR format: "
            "Situation, Background, Assessment, Recommendation."
        )
    )

    return {
        "patient_id": patient_id,
        "handover": answer,
    }