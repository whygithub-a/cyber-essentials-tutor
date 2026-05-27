import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router
from app.api.topics import router as topics_router
from app.api.retrieval import router as retrieval_router
from app.api.chat import router as chat_router
from app.api.assessment import router as assessment_router
from app.api.progress import router as progress_router

load_dotenv()

app = FastAPI(title="Cyber Essentials Tutor API")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

frontend_origins_raw = os.getenv(
    "FRONTEND_ORIGINS",
    os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
)

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in frontend_origins_raw.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(topics_router)
app.include_router(retrieval_router)
app.include_router(chat_router)
app.include_router(assessment_router)
app.include_router(progress_router)


@app.get("/")
def root():
    return {"message": "Cyber Essentials Tutor API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}