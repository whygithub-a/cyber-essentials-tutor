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