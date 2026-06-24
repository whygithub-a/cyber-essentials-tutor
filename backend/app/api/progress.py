from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/progress", tags=["progress"])


TOPIC_ORDER = [
    "firewalls",
    "secure_configuration",
    "security_update_management",
    "user_access_control",
    "malware_protection",
]

TOPIC_LABELS = {
    "firewalls": "Firewalls",
    "secure_configuration": "Secure Configuration",
    "security_update_management": "Security Update Management",
    "user_access_control": "User Access Control",
    "malware_protection": "Malware Protection",
}

XP_PER_QUESTION = 20


class ProgressUpdateRequest(BaseModel):
    session_id: str
    topic_id: str
    question_id: str
    completed: bool = True
    latest_score: int
    max_score: int
    missing_points: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)


class ProgressItem(BaseModel):
    session_id: str
    topic_id: str
    completed: bool
    latest_score: Optional[int] = None
    max_score: Optional[int] = None
    badge_awarded: Optional[str] = None
    updated_at: Optional[str] = None
    total_questions: int = 0
    attempted_questions: int = 0
    mastery_percentage: int = 0
    xp: int = 0


class ProgressResponse(BaseModel):
    session_id: str
    overall_mastery: int = 0
    total_xp: int = 0
    badges: dict[str, int]
    progress: list[ProgressItem]


class WeaknessItem(BaseModel):
    topic_id: str
    topic_label: str
    question_id: str
    question_text: str
    question_position: int
    total_questions: int
    score: int
    max_score: int
    mastery_percentage: int
    missing_points: list[str]
    created_at: Optional[str] = None


class WeaknessTopicGroup(BaseModel):
    topic_id: str
    topic_label: str
    weak_question_count: int
    missing_point_count: int
    weaknesses: list[WeaknessItem]


class WeaknessSummaryResponse(BaseModel):
    session_id: str
    total_weak_questions: int
    total_missing_points: int
    weaknesses: list[WeaknessTopicGroup]


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_list(value) -> list[str]:
    if value is None:
        return []

    if isinstance(value, list):
        result: list[str] = []

        for item in value:
            if item is None:
                continue

            text = str(item).strip()

            if text:
                result.append(text)

        return result

    text = str(value).strip()

    if not text:
        return []

    return [text]


def topic_sort_key(topic_id: str) -> tuple[int, str]:
    if topic_id in TOPIC_ORDER:
        return TOPIC_ORDER.index(topic_id), topic_id

    return len(TOPIC_ORDER), topic_id


def get_topic_label(topic_id: str) -> str:
    return TOPIC_LABELS.get(topic_id, topic_id.replace("_", " ").title())


def calculate_badge(
    attempted_questions: int,
    total_questions: int,
    mastery_percentage: int,
) -> str:
    if attempted_questions <= 0:
        return "not_started"

    if total_questions > 0 and attempted_questions == total_questions and mastery_percentage == 100:
        return "mastered"

    if mastery_percentage >= 85:
        return "gold"

    if mastery_percentage >= 70:
        return "silver"

    if mastery_percentage >= 50:
        return "bronze"

    return "started"


def get_active_questions() -> list[dict]:
    response = (
        supabase.table("assessment_questions")
        .select("id, topic_id, question_text, question_order")
        .eq("is_active", True)
        .execute()
    )

    return response.data or []


def get_rubric_max_scores() -> dict[str, int]:
    response = (
        supabase.table("rubrics")
        .select("question_id, max_score")
        .execute()
    )

    rubric_max_scores: dict[str, int] = {}

    for row in response.data or []:
        question_id = row.get("question_id")
        max_score = safe_int(row.get("max_score"), 5)

        if question_id and max_score > 0:
            rubric_max_scores[str(question_id)] = max_score

    return rubric_max_scores


def get_attempts_for_session(session_id: str) -> list[dict]:
    response = (
        supabase.table("assessment_attempts")
        .select(
            "question_id, topic_id, score, max_score, "
            "missing_points, strengths, created_at"
        )
        .eq("session_id", session_id)
        .execute()
    )

    return response.data or []


def get_best_attempts_by_question(
    attempts: list[dict],
    active_question_ids: set[str],
) -> dict[str, dict]:
    best_attempts: dict[str, dict] = {}

    for attempt in attempts:
        question_id = attempt.get("question_id")

        if not question_id:
            continue

        question_id = str(question_id)

        if question_id not in active_question_ids:
            continue

        score = safe_int(attempt.get("score"), 0)
        max_score = safe_int(attempt.get("max_score"), 0)

        if max_score <= 0:
            continue

        score = max(0, min(score, max_score))
        ratio = score / max_score

        created_at = attempt.get("created_at")
        existing_best = best_attempts.get(question_id)

        should_replace = False

        if existing_best is None:
            should_replace = True
        elif ratio > existing_best["ratio"]:
            should_replace = True
        elif ratio == existing_best["ratio"]:
            existing_created_at = existing_best.get("created_at")

            if created_at and (
                existing_created_at is None or created_at > existing_created_at
            ):
                should_replace = True

        if should_replace:
            best_attempts[question_id] = {
                "score": score,
                "max_score": max_score,
                "ratio": ratio,
                "missing_points": safe_list(attempt.get("missing_points")),
                "strengths": safe_list(attempt.get("strengths")),
                "created_at": created_at,
            }

    return best_attempts


def build_questions_by_topic(active_questions: list[dict]) -> dict[str, list[dict]]:
    questions_by_topic: dict[str, list[dict]] = {}

    for question in active_questions:
        question_id = question.get("id")
        topic_id = question.get("topic_id")

        if not question_id or not topic_id:
            continue

        topic_id = str(topic_id)

        if topic_id not in TOPIC_ORDER:
            continue

        questions_by_topic.setdefault(topic_id, []).append(question)

    for topic_id in TOPIC_ORDER:
        questions_by_topic.setdefault(topic_id, [])

    for topic_questions in questions_by_topic.values():
        topic_questions.sort(
            key=lambda item: (
                safe_int(item.get("question_order"), 999999),
                str(item.get("id")),
            )
        )

    return questions_by_topic


def build_progress_summary(session_id: str) -> ProgressResponse:
    active_questions = get_active_questions()
    rubric_max_scores = get_rubric_max_scores()
    attempts = get_attempts_for_session(session_id)

    questions_by_topic = build_questions_by_topic(active_questions)

    active_question_ids = {
        str(question.get("id"))
        for question in active_questions
        if question.get("id")
    }

    best_attempts = get_best_attempts_by_question(
        attempts=attempts,
        active_question_ids=active_question_ids,
    )

    progress_items: list[ProgressItem] = []

    for topic_id in sorted(questions_by_topic.keys(), key=topic_sort_key):
        topic_questions = questions_by_topic[topic_id]

        total_questions = len(topic_questions)
        attempted_questions = 0
        total_best_score = 0
        total_possible_score = 0
        topic_xp = 0
        latest_updated_at: Optional[str] = None

        for question in topic_questions:
            question_id = str(question.get("id"))
            question_max_score = rubric_max_scores.get(question_id, 5)

            total_possible_score += question_max_score

            best_attempt = best_attempts.get(question_id)

            if best_attempt:
                attempted_questions += 1

                best_ratio = best_attempt["ratio"]
                normalised_score = round(best_ratio * question_max_score)

                total_best_score += normalised_score
                topic_xp += round(best_ratio * XP_PER_QUESTION)

                attempt_created_at = best_attempt.get("created_at")

                if attempt_created_at and (
                    latest_updated_at is None or attempt_created_at > latest_updated_at
                ):
                    latest_updated_at = attempt_created_at

        mastery_percentage = (
            round((total_best_score / total_possible_score) * 100)
            if total_possible_score > 0
            else 0
        )

        badge_awarded = calculate_badge(
            attempted_questions=attempted_questions,
            total_questions=total_questions,
            mastery_percentage=mastery_percentage,
        )

        completed = total_questions > 0 and attempted_questions == total_questions

        progress_items.append(
            ProgressItem(
                session_id=session_id,
                topic_id=topic_id,
                completed=completed,
                latest_score=total_best_score,
                max_score=total_possible_score,
                badge_awarded=badge_awarded,
                updated_at=latest_updated_at,
                total_questions=total_questions,
                attempted_questions=attempted_questions,
                mastery_percentage=mastery_percentage,
                xp=topic_xp,
            )
        )

    total_possible_score = sum(item.max_score or 0 for item in progress_items)
    total_best_score = sum(item.latest_score or 0 for item in progress_items)

    overall_mastery = (
        round((total_best_score / total_possible_score) * 100)
        if total_possible_score > 0
        else 0
    )

    total_xp = sum(item.xp for item in progress_items)

    badge_counts = {
        "mastered": 0,
        "gold": 0,
        "silver": 0,
        "bronze": 0,
        "started": 0,
        "not_started": 0,
    }

    for item in progress_items:
        if item.badge_awarded in badge_counts:
            badge_counts[item.badge_awarded] += 1

    return ProgressResponse(
        session_id=session_id,
        overall_mastery=overall_mastery,
        total_xp=total_xp,
        badges=badge_counts,
        progress=progress_items,
    )


def build_weakness_summary(session_id: str) -> WeaknessSummaryResponse:
    active_questions = get_active_questions()
    rubric_max_scores = get_rubric_max_scores()
    attempts = get_attempts_for_session(session_id)

    questions_by_topic = build_questions_by_topic(active_questions)

    active_question_ids = {
        str(question.get("id"))
        for question in active_questions
        if question.get("id")
    }

    best_attempts = get_best_attempts_by_question(
        attempts=attempts,
        active_question_ids=active_question_ids,
    )

    topic_groups: list[WeaknessTopicGroup] = []

    for topic_id in sorted(questions_by_topic.keys(), key=topic_sort_key):
        topic_questions = questions_by_topic[topic_id]
        topic_label = get_topic_label(topic_id)
        total_questions = len(topic_questions)

        weakness_items: list[WeaknessItem] = []

        for index, question in enumerate(topic_questions):
            question_id = str(question.get("id"))
            question_text = str(question.get("question_text") or "")
            question_max_score = rubric_max_scores.get(question_id, 5)
            best_attempt = best_attempts.get(question_id)

            if not best_attempt:
                continue

            score = safe_int(best_attempt.get("score"), 0)
            max_score = safe_int(best_attempt.get("max_score"), question_max_score)

            if max_score <= 0:
                continue

            if score >= max_score:
                continue

            missing_points = safe_list(best_attempt.get("missing_points"))

            if not missing_points:
                missing_points = [
                    "This question has a non-perfect best score, but no missing point details were stored for the selected attempt."
                ]

            mastery_percentage = round((score / max_score) * 100)

            weakness_items.append(
                WeaknessItem(
                    topic_id=topic_id,
                    topic_label=topic_label,
                    question_id=question_id,
                    question_text=question_text,
                    question_position=index + 1,
                    total_questions=total_questions,
                    score=score,
                    max_score=max_score,
                    mastery_percentage=mastery_percentage,
                    missing_points=missing_points,
                    created_at=best_attempt.get("created_at"),
                )
            )

        if weakness_items:
            topic_groups.append(
                WeaknessTopicGroup(
                    topic_id=topic_id,
                    topic_label=topic_label,
                    weak_question_count=len(weakness_items),
                    missing_point_count=sum(
                        len(item.missing_points) for item in weakness_items
                    ),
                    weaknesses=weakness_items,
                )
            )

    total_weak_questions = sum(group.weak_question_count for group in topic_groups)
    total_missing_points = sum(group.missing_point_count for group in topic_groups)

    return WeaknessSummaryResponse(
        session_id=session_id,
        total_weak_questions=total_weak_questions,
        total_missing_points=total_missing_points,
        weaknesses=topic_groups,
    )


def validate_question_topic(question_id: str, topic_id: str) -> None:
    response = (
        supabase.table("assessment_questions")
        .select("id, topic_id")
        .eq("id", question_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Assessment question not found")

    actual_topic_id = response.data[0].get("topic_id")

    if actual_topic_id != topic_id:
        raise HTTPException(
            status_code=400,
            detail="Question does not belong to the submitted topic",
        )


def record_assessment_attempt(request: ProgressUpdateRequest) -> None:
    validate_question_topic(
        question_id=request.question_id,
        topic_id=request.topic_id,
    )

    if request.max_score <= 0:
        raise HTTPException(status_code=400, detail="max_score must be greater than zero")

    score = max(0, min(request.latest_score, request.max_score))

    record = {
        "session_id": request.session_id,
        "topic_id": request.topic_id,
        "question_id": request.question_id,
        "score": score,
        "max_score": request.max_score,
        "missing_points": request.missing_points,
        "strengths": request.strengths,
    }

    response = (
        supabase.table("assessment_attempts")
        .insert(record)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Assessment attempt insert failed")


@router.get("/weaknesses/{session_id}", response_model=WeaknessSummaryResponse)
def get_weaknesses(session_id: str):
    try:
        return build_weakness_summary(session_id)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{session_id}", response_model=ProgressResponse)
def get_progress(session_id: str):
    try:
        return build_progress_summary(session_id)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/update", response_model=ProgressItem)
def update_progress(request: ProgressUpdateRequest):
    try:
        record_assessment_attempt(request)

        progress_summary = build_progress_summary(request.session_id)

        matching_item = next(
            (
                item
                for item in progress_summary.progress
                if item.topic_id == request.topic_id
            ),
            None,
        )

        if matching_item is None:
            raise HTTPException(status_code=404, detail="Topic progress not found")

        return matching_item

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))