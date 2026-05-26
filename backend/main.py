import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai import router as ai_router

load_dotenv()

app = FastAPI(title="Cyber Essentials Tutor API")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/")
def root():
    return {"message": "Cyber Essentials Tutor API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}