import os
import json

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url=os.getenv("AZURE_OPENAI_BASE_URL"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)

PLAIN_TEXT_RESPONSE_RULES = """
Output-format requirements:

- Write the response in plain text.
- Do not use Markdown bold or italic formatting.
- Do not place asterisks around words or phrases for emphasis.
- Do not begin list items with an asterisk.
- When several points are needed, use short paragraphs or numbered items such as 1., 2. and 3.
- Use an asterisk only when it is technically meaningful, such as a wildcard, file pattern, mathematical expression, or literal text supplied by the user or source material.
""".strip()

def create_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        model= os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
        input=text,
    )

    return response.data[0].embedding

def generate_test_response(user_message: str) -> str:
    response = client.responses.create(
        model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
        input=[
            {
                "role": "system",
                "content": (
                    "You are a helpful educational assistant for a "
                    "Cyber Essentials tutoring prototype.\n\n"
                    f"{PLAIN_TEXT_RESPONSE_RULES}"
                ),
            },
            {
                "role": "user",
                "content": user_message,
            },
        ],
    )

    return response.output_text

def generate_grounded_response(
    user_question: str,
    current_context: str | None,
    retrieved_contexts: list[dict],
) -> str:
    context_blocks = []

    if current_context:
        context_blocks.append(
            "CURRENT READING CONTEXT:\n"
            f"{current_context}"
        )

    if retrieved_contexts:
        retrieved_text = "\n\n".join(
            [
                f"[Source {index + 1}: {item.get('section_title', 'Unknown section')}]\n{item.get('content', '')}"
                for index, item in enumerate(retrieved_contexts)
            ]
        )

        context_blocks.append(
            "RETRIEVED CYBER ESSENTIALS CONTEXT:\n"
            f"{retrieved_text}"
        )

    combined_context = "\n\n---\n\n".join(context_blocks)

    system_message = f"""
You are an educational AI tutor for a Cyber Essentials learning prototype.

You must answer using the provided Cyber Essentials context where possible.
Prioritise the current reading context when it is provided.
Use the retrieved context to support, clarify, or extend the answer.
Do not present yourself as an official Cyber Essentials certification assessor.
Do not make certification decisions.
If the provided context is insufficient, say that the available context is limited.
Give clear, practical, learner-friendly explanations.

{PLAIN_TEXT_RESPONSE_RULES}
""".strip()

    user_prompt = f"""
User question:
{user_question}

Available context:
{combined_context if combined_context else "No Cyber Essentials context was retrieved."}

Answer the user's question using the available context.
""".strip()

    response = client.responses.create(
        model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
        input=[
            {
                "role": "system",
                "content": system_message,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    )

    return response.output_text

def generate_assessment_feedback(
    question_text: str,
    scenario_context: str | None,
    user_answer: str,
    expected_points: list[str],
    max_score: int,
    retrieved_contexts: list[dict],
) -> dict:
    retrieved_text = "\n\n".join(
        [
            f"[Source {index + 1}: {item.get('section_title', 'Unknown section')}]\n{item.get('content', '')}"
            for index, item in enumerate(retrieved_contexts)
        ]
    )

    system_message = f"""
You are an educational assessor for a Cyber Essentials learning prototype.

You provide formative feedback only.
You must not present the result as an official Cyber Essentials certification decision.
Use the rubric and retrieved Cyber Essentials context to assess the learner's answer.
Be fair, specific and constructive.

Return only valid JSON.
Do not place the JSON inside a Markdown code block.
Each item in strengths and missing_points must be one clear plain-text sentence.
The feedback value must use plain text.
All text values inside the JSON must follow the output-format requirements below.

{PLAIN_TEXT_RESPONSE_RULES}
""".strip()

    user_prompt = f"""
Scenario:
{scenario_context or ""}

Question:
{question_text}

Learner answer:
{user_answer}

Rubric expected points:
{json.dumps(expected_points, ensure_ascii=False, indent=2)}

Maximum score:
{max_score}

Retrieved Cyber Essentials context:
{retrieved_text if retrieved_text else "No context retrieved."}

Return only this JSON structure:
{{
  "score": 0,
  "strengths": ["..."],
  "missing_points": ["..."],
  "feedback": "..."
}}

The score must be an integer between 0 and {max_score}.
""".strip()

    response = client.responses.create(
        model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
        input=[
            {
                "role": "system",
                "content": system_message,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    )

    raw_text = response.output_text.strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        parsed = {
            "score": 0,
            "strengths": [],
            "missing_points": ["The feedback could not be parsed into structured JSON."],
            "feedback": raw_text,
        }

    parsed["score"] = max(0, min(int(parsed.get("score", 0)), max_score))
    parsed.setdefault("strengths", [])
    parsed.setdefault("missing_points", [])
    parsed.setdefault("feedback", "")

    return parsed