import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url=os.getenv("AZURE_OPENAI_BASE_URL"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)

def create_embedding(text: str) -> list[float]:
    response = client.embeddings.create(
        model=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
        input=text,
    )

    return response.data[0].embedding

def generate_test_response(user_message: str) -> str:
    response = client.responses.create(
        model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
        input=[
            {
                "role": "system",
                "content": "You are a helpful educational assistant for a Cyber Essentials tutoring prototype.",
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

    system_message = """
You are an educational AI tutor for a Cyber Essentials learning prototype.

You must answer using the provided Cyber Essentials context where possible.
Prioritise the current reading context when it is provided.
Use the retrieved context to support, clarify, or extend the answer.
Do not present yourself as an official Cyber Essentials certification assessor.
Do not make certification decisions.
If the provided context is insufficient, say that the available context is limited.
Give clear, practical, learner-friendly explanations.
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