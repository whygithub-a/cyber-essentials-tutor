from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/progress", tags=["progress"])


class ProgressUpdateRequest(BaseModel):
    session_id: str
    topic_id: str
    completed: bool = False
    latest_score: Optional[int] = None
    max_score: Optional[int] = None


class ProgressItem(BaseModel):
    session_id: str
    topic_id: str
    completed: bool
    latest_score: Optional[int] = None
    max_score: Optional[int] = None
    badge_awarded: Optional[str] = None
    updated_at: Optional[str] = None


class ProgressResponse(BaseModel):
    session_id: str
    progress: list[ProgressItem]


def calculate_badge(
    completed: bool,
    latest_score: Optional[int],
    max_score: Optional[int],
) -> Optional[str]:
    if not completed:
        return None

    if latest_score is None or max_score is None or max_score <= 0:
        return "completed"

    ratio = latest_score / max_score

    if ratio >= 0.8:
        return "strong_understanding"

    if ratio >= 0.5:
        return "developing_understanding"

    return "needs_review"


@router.get("/{session_id}", response_model=ProgressResponse)
def get_progress(session_id: str):
    try:
        response = (
            supabase.table("progress_sessions")
            .select(
                "session_id, topic_id, completed, latest_score, max_score, badge_awarded, updated_at"
            )
            .eq("session_id", session_id)
            .order("topic_id")
            .execute()
        )

        return ProgressResponse(
            session_id=session_id,
            progress=response.data or [],
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/update", response_model=ProgressItem)
def update_progress(request: ProgressUpdateRequest):
    try:
        badge_awarded = calculate_badge(
            completed=request.completed,
            latest_score=request.latest_score,
            max_score=request.max_score,
        )

        record = {
            "session_id": request.session_id,
            "topic_id": request.topic_id,
            "completed": request.completed,
            "latest_score": request.latest_score,
            "max_score": request.max_score,
            "badge_awarded": badge_awarded,
        }

        response = (
            supabase.table("progress_sessions")
            .upsert(record, on_conflict="session_id,topic_id")
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=500, detail="Progress update failed")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))