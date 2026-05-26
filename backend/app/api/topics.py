from fastapi import APIRouter, HTTPException

from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("")
def get_topics():
    try:
        response = (
            supabase.table("topics")
            .select("id, title, description, display_order")
            .order("display_order")
            .execute()
        )

        return {"topics": response.data}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))