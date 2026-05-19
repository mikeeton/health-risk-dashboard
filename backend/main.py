from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import engine

from routes import patients, vitals, auth, reviews

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Health Risk Monitoring API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(vitals.router)
app.include_router(reviews.router)


@app.get("/")
def root():
    return {
        "message": "AI Health Risk Monitoring API is running"
    }