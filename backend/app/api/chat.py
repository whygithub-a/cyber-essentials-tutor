from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.azure_openai import create_embedding, generate_grounded_response
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    topic_id: Optional[str] = None
    current_chunk_id: Optional[str] = None
    match_count: int = 5


class SourceItem(BaseModel):
    id: str
    topic_id: Optional[str] = None
    section_title: Optional[str] = None
    page_number: Optional[int] = None
    similarity: Optional[float] = None
    content_preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]


def get_current_chunk(current_chunk_id: str) -> dict | None:
    response = (
        supabase.table("document_chunks")
        .select("id, topic_id, section_title, page_number, content, metadata")
        .eq("id", current_chunk_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


def retrieve_relevant_chunks(
    question: str,
    topic_id: Optional[str],
    match_count: int,
) -> list[dict]:
    query_embedding = create_embedding(question)

    response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": match_count,
            "filter_topic_id": topic_id,
        },
    ).execute()

    return response.data or []


def build_sources(
    retrieved_chunks: list[dict],
    current_chunk: dict | None,
) -> list[SourceItem]:
    sources: list[SourceItem] = []
    seen_ids: set[str] = set()

    if current_chunk:
        current_id = current_chunk["id"]
        seen_ids.add(current_id)

        sources.append(
            SourceItem(
                id=current_id,
                topic_id=current_chunk.get("topic_id"),
                section_title=current_chunk.get("section_title"),
                page_number=current_chunk.get("page_number"),
                similarity=None,
                content_preview=current_chunk.get("content", "")[:250],
            )
        )

    for chunk in retrieved_chunks:
        chunk_id = chunk["id"]

        if chunk_id in seen_ids:
            continue

        seen_ids.add(chunk_id)

        sources.append(
            SourceItem(
                id=chunk_id,
                topic_id=chunk.get("topic_id"),
                section_title=chunk.get("section_title"),
                page_number=chunk.get("page_number"),
                similarity=chunk.get("similarity"),
                content_preview=chunk.get("content", "")[:250],
            )
        )

    return sources


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        current_chunk = None
        current_context = None

        if request.current_chunk_id:
            current_chunk = get_current_chunk(request.current_chunk_id)

            if not current_chunk:
                raise HTTPException(
                    status_code=404,
                    detail="Current reading chunk not found",
                )

            current_context = current_chunk["content"]

        retrieved_chunks = retrieve_relevant_chunks(
            question=request.question,
            topic_id=request.topic_id,
            match_count=request.match_count,
        )

        answer = generate_grounded_response(
            user_question=request.question,
            current_context=current_context,
            retrieved_contexts=retrieved_chunks,
        )

        sources = build_sources(
            retrieved_chunks=retrieved_chunks,
            current_chunk=current_chunk,
        )

        return ChatResponse(answer=answer, sources=sources)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))