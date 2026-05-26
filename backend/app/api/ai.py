from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.core.azure_openai import generate_test_response

router = APIRouter(prefix="/api/ai", tags=["ai"])


class AITestRequest(BaseModel):
    message: str


class AITestResponse(BaseModel):
    answer: str


@router.post("/test", response_model=AITestResponse)
def test_ai(request: AITestRequest):
    try:
        answer = generate_test_response(request.message)
        return AITestResponse(answer=answer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))