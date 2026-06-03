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
    question_order: Optional[int] = None
    official_ref: Optional[str] = None
    source_title: Optional[str] = None
    question_position: int = 1
    total_questions: int = 1


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


def question_sort_key(question: dict) -> tuple[int, str, str]:
    raw_order = question.get("question_order")

    if raw_order is None:
        order = 1_000_000
    else:
        try:
            order = int(raw_order)
        except (TypeError, ValueError):
            order = 1_000_000

    created_at = question.get("created_at") or ""
    question_id = question.get("id") or ""

    return order, created_at, question_id


def add_question_number_fields(question: dict, questions: list[dict]) -> dict:
    question_id = question.get("id")
    total_questions = len(questions)

    question_position = 1

    for index, item in enumerate(questions):
        if item.get("id") == question_id:
            question_position = index + 1
            break

    result = dict(question)
    result["question_position"] = question_position
    result["total_questions"] = total_questions

    return result


def get_active_questions_for_topic(topic_id: str) -> list[dict]:
    response = (
        supabase.table("assessment_questions")
        .select(
            "id, topic_id, question_text, scenario_context, difficulty, "
            "question_order, official_ref, source_title, created_at"
        )
        .eq("topic_id", topic_id)
        .eq("is_active", True)
        .execute()
    )

    questions = response.data or []
    questions.sort(key=question_sort_key)

    return questions


def get_attempted_question_ids(session_id: str, topic_id: str) -> set[str]:
    response = (
        supabase.table("assessment_attempts")
        .select("question_id")
        .eq("session_id", session_id)
        .eq("topic_id", topic_id)
        .execute()
    )

    attempted_question_ids: set[str] = set()

    for row in response.data or []:
        question_id = row.get("question_id")
        if question_id:
            attempted_question_ids.add(str(question_id))

    return attempted_question_ids


def select_first_unanswered_question(
    topic_id: str,
    session_id: str,
    questions: list[dict],
) -> dict:
    attempted_question_ids = get_attempted_question_ids(
        session_id=session_id,
        topic_id=topic_id,
    )

    for question in questions:
        question_id = str(question.get("id"))

        if question_id not in attempted_question_ids:
            return question

    return questions[0]


def select_next_question_by_current_question(
    questions: list[dict],
    current_question_id: str,
) -> dict:
    if len(questions) == 1:
        return questions[0]

    current_index: Optional[int] = None

    for index, question in enumerate(questions):
        if question.get("id") == current_question_id:
            current_index = index
            break

    if current_index is None:
        return questions[0]

    next_index = (current_index + 1) % len(questions)

    return questions[next_index]


def select_previous_question_by_current_question(
    questions: list[dict],
    current_question_id: str,
) -> dict:
    if len(questions) == 1:
        return questions[0]

    current_index: Optional[int] = None

    for index, question in enumerate(questions):
        if question.get("id") == current_question_id:
            current_index = index
            break

    if current_index is None:
        return questions[0]

    previous_index = (current_index - 1) % len(questions)

    return questions[previous_index]


def select_question_for_topic(
    topic_id: str,
    session_id: Optional[str] = None,
    exclude_question_id: Optional[str] = None,
    previous_question_id: Optional[str] = None,
) -> dict:
    questions = get_active_questions_for_topic(topic_id)

    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"No active assessment question found for topic_id={topic_id}",
        )

    if previous_question_id:
        selected_question = select_previous_question_by_current_question(
            questions=questions,
            current_question_id=previous_question_id,
        )
        return add_question_number_fields(selected_question, questions)

    if exclude_question_id:
        selected_question = select_next_question_by_current_question(
            questions=questions,
            current_question_id=exclude_question_id,
        )
        return add_question_number_fields(selected_question, questions)

    if session_id:
        selected_question = select_first_unanswered_question(
            topic_id=topic_id,
            session_id=session_id,
            questions=questions,
        )
        return add_question_number_fields(selected_question, questions)

    return add_question_number_fields(questions[0], questions)


@router.get("/question/{topic_id}", response_model=AssessmentQuestionResponse)
def get_question(
    topic_id: str,
    session_id: Optional[str] = None,
    exclude_question_id: Optional[str] = None,
    previous_question_id: Optional[str] = None,
):
    try:
        return select_question_for_topic(
            topic_id=topic_id,
            session_id=session_id,
            exclude_question_id=exclude_question_id,
            previous_question_id=previous_question_id,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def get_question_and_rubric(question_id: str) -> tuple[dict, dict]:
    question_response = (
        supabase.table("assessment_questions")
        .select(
            "id, topic_id, question_text, scenario_context, difficulty, "
            "question_order, official_ref, source_title"
        )
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