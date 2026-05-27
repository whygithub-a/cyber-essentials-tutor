from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.azure_openai import create_embedding, generate_assessment_feedback
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/assessment", tags=["assessment"])


class AssessmentQuestionResponse(BaseModel):
    id: str
    topic_id: str
    question_text: str
    scenario_context: Optional[str] = None
    difficulty: Optional[str] = None


class AssessmentSubmitRequest(BaseModel):
    question_id: str
    user_answer: str
    match_count: int = 4


class AssessmentSourceItem(BaseModel):
    id: str
    topic_id: Optional[str] = None
    section_title: Optional[str] = None
    page_number: Optional[int] = None
    similarity: Optional[float] = None
    content_preview: str


class AssessmentSubmitResponse(BaseModel):
    score: int
    max_score: int
    strengths: list[str]
    missing_points: list[str]
    feedback: str
    sources: list[AssessmentSourceItem]


@router.get("/question/{topic_id}", response_model=AssessmentQuestionResponse)
def get_question(topic_id: str):
    try:
        response = (
            supabase.table("assessment_questions")
            .select("id, topic_id, question_text, scenario_context, difficulty")
            .eq("topic_id", topic_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"No active assessment question found for topic_id={topic_id}",
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def get_question_and_rubric(question_id: str) -> tuple[dict, dict]:
    question_response = (
        supabase.table("assessment_questions")
        .select("id, topic_id, question_text, scenario_context, difficulty")
        .eq("id", question_id)
        .limit(1)
        .execute()
    )

    if not question_response.data:
        raise HTTPException(status_code=404, detail="Assessment question not found")

    rubric_response = (
        supabase.table("rubrics")
        .select("id, question_id, max_score, expected_points")
        .eq("question_id", question_id)
        .limit(1)
        .execute()
    )

    if not rubric_response.data:
        raise HTTPException(status_code=404, detail="Rubric not found for this question")

    return question_response.data[0], rubric_response.data[0]


def retrieve_assessment_context(
    question_text: str,
    scenario_context: str | None,
    user_answer: str,
    topic_id: str,
    match_count: int,
) -> list[dict]:
    retrieval_query = f"""
Question:
{question_text}

Scenario:
{scenario_context or ""}

Learner answer:
{user_answer}
""".strip()

    query_embedding = create_embedding(retrieval_query)

    response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": match_count,
            "filter_topic_id": topic_id,
        },
    ).execute()

    return response.data or []


def build_sources(retrieved_chunks: list[dict]) -> list[AssessmentSourceItem]:
    sources: list[AssessmentSourceItem] = []

    for chunk in retrieved_chunks:
        sources.append(
            AssessmentSourceItem(
                id=chunk["id"],
                topic_id=chunk.get("topic_id"),
                section_title=chunk.get("section_title"),
                page_number=chunk.get("page_number"),
                similarity=chunk.get("similarity"),
                content_preview=chunk.get("content", "")[:250],
            )
        )

    return sources


@router.post("/submit", response_model=AssessmentSubmitResponse)
def submit_answer(request: AssessmentSubmitRequest):
    try:
        question, rubric = get_question_and_rubric(request.question_id)

        retrieved_chunks = retrieve_assessment_context(
            question_text=question["question_text"],
            scenario_context=question.get("scenario_context"),
            user_answer=request.user_answer,
            topic_id=question["topic_id"],
            match_count=request.match_count,
        )

        feedback = generate_assessment_feedback(
            question_text=question["question_text"],
            scenario_context=question.get("scenario_context"),
            user_answer=request.user_answer,
            expected_points=rubric["expected_points"],
            max_score=rubric["max_score"],
            retrieved_contexts=retrieved_chunks,
        )

        return AssessmentSubmitResponse(
            score=feedback["score"],
            max_score=rubric["max_score"],
            strengths=feedback["strengths"],
            missing_points=feedback["missing_points"],
            feedback=feedback["feedback"],
            sources=build_sources(retrieved_chunks),
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))