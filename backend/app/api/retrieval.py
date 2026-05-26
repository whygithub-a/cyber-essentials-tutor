from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.azure_openai import create_embedding
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/retrieval", tags=["retrieval"])


class RetrievalTestRequest(BaseModel):
    question: str
    topic_id: Optional[str] = None
    match_count: int = 5


@router.post("/test")
def test_retrieval(request: RetrievalTestRequest):
    try:
        query_embedding = create_embedding(request.question)

        response = supabase.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": request.match_count,
                "filter_topic_id": request.topic_id,
            },
        ).execute()

        return {"matches": response.data}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))