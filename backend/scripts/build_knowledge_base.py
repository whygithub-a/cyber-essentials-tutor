import re
import sys
import time
from pathlib import Path
from typing import Any

import fitz

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.append(str(BACKEND_DIR))

from app.core.azure_openai import create_embedding
from app.core.supabase_client import supabase


PDF_PATH = BACKEND_DIR / "source_documents" / "cyber-essentials-requirements-for-it-infrastructure-v3-3.pdf"

SOURCE_DOCUMENT = {
    "title": "Cyber Essentials Requirements for IT Infrastructure",
    "publisher": "NCSC",
    "version": "v3.3",
    "url": "https://www.ncsc.gov.uk/files/cyber-essentials-requirements-for-it-infrastructure-v3-3.pdf",
}


TARGET_SECTIONS: list[dict[str, Any]] = [
    {
        "name": "B. Definitions",
        "search_terms": ["B. Definitions", "Definitions"],
        "expected_page": 4,
        "topic_id": None,
        "content_type": "background_definition",
        "retrievable": True,
        "include_in_default_retrieval": False,
        "include": True,
    },
    {
        "name": "C. Backing up your data",
        "search_terms": ["C. Backing up your data", "Backing up your data"],
        "expected_page": 5,
        "topic_id": None,
        "content_type": "background_backup",
        "retrievable": True,
        "include_in_default_retrieval": False,
        "include": True,
    },
    {
        "name": "D. Scope",
        "search_terms": ["D. Scope", "Scope"],
        "expected_page": 6,
        "topic_id": None,
        "content_type": "background_scope",
        "retrievable": True,
        "include_in_default_retrieval": False,
        "include": True,
    },
    {
        "name": "1. Firewalls",
        "search_terms": ["1. Firewalls", "Firewalls"],
        "expected_page": 13,
        "topic_id": "firewalls",
        "content_type": "control_requirement",
        "retrievable": True,
        "include_in_default_retrieval": True,
        "include": True,
    },
    {
        "name": "2. Secure Configuration",
        "search_terms": ["2. Secure Configuration", "Secure Configuration"],
        "expected_page": 14,
        "topic_id": "secure_configuration",
        "content_type": "control_requirement",
        "retrievable": True,
        "include_in_default_retrieval": True,
        "include": True,
    },
    {
        "name": "3. Security Update Management",
        "search_terms": ["3. Security Update Management", "Security Update Management"],
        "expected_page": 16,
        "topic_id": "security_update_management",
        "content_type": "control_requirement",
        "retrievable": True,
        "include_in_default_retrieval": True,
        "include": True,
    },
    {
        "name": "4. User Access Control",
        "search_terms": ["4. User Access Control", "User Access Control"],
        "expected_page": 18,
        "topic_id": "user_access_control",
        "content_type": "control_requirement",
        "retrievable": True,
        "include_in_default_retrieval": True,
        "include": True,
    },
    {
        "name": "5. Malware protection",
        "search_terms": ["5. Malware protection", "Malware protection", "Malware Protection"],
        "expected_page": 23,
        "topic_id": "malware_protection",
        "content_type": "control_requirement",
        "retrievable": True,
        "include_in_default_retrieval": True,
        "include": True,
    },
    {
        "name": "F. Further guidance",
        "search_terms": ["F. Further guidance", "Further guidance"],
        "expected_page": 24,
        "topic_id": None,
        "content_type": "excluded_further_guidance",
        "retrievable": False,
        "include_in_default_retrieval": False,
        "include": False,
    },
]

def normalise_text(text: str) -> str:
    text = text.replace("\u00a0", " ")

    # Remove repeated PDF headers and footers.
    text = re.sub(
        r"Cyber Essentials: Requirements for IT Infrastructure v3\.3",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"April 2026", "", text, flags=re.IGNORECASE)
    text = re.sub(r"All material is UK Crown Copyright ©", "", text, flags=re.IGNORECASE)

    # Remove standalone page numbers.
    text = re.sub(r"\n\s*\d+\s*\n", "\n", text)

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def extract_pdf_text_with_page_markers(pdf_path: Path) -> str:
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    document = fitz.open(pdf_path)
    pages: list[str] = []

    for page_index, page in enumerate(document, start=1):
        page_text = page.get_text("text")
        pages.append(f"\n\n[[PAGE {page_index}]]\n\n{page_text}")

    return normalise_text("\n".join(pages))


def get_page_offset(full_text: str, page_number: int) -> int:
    marker = f"[[PAGE {page_number}]]"
    index = full_text.find(marker)

    if index == -1:
        return 0

    return index


def find_section_offset(full_text: str, section: dict[str, Any]) -> int:
    expected_page = section["expected_page"]

    # Start near the expected page so that we avoid matching the table of contents.
    search_start = get_page_offset(full_text, max(expected_page - 1, 1))

    for term in section["search_terms"]:
        pattern = re.compile(
            rf"^\s*{re.escape(term)}\s*$",
            flags=re.IGNORECASE | re.MULTILINE,
        )

        match = pattern.search(full_text, pos=search_start)

        if match:
            return match.start()

    # Fallback: search by plain substring after the expected page.
    lowered_text = full_text.lower()
    for term in section["search_terms"]:
        index = lowered_text.find(term.lower(), search_start)
        if index != -1:
            return index

    raise ValueError(f"Could not find section heading: {section['name']}")


def estimate_page_number(full_text: str, offset: int) -> int | None:
    page_markers = list(re.finditer(r"\[\[PAGE (\d+)\]\]", full_text[:offset]))

    if not page_markers:
        return None

    return int(page_markers[-1].group(1))


def split_into_sections(full_text: str) -> list[dict[str, Any]]:
    found_sections: list[dict[str, Any]] = []

    for section in TARGET_SECTIONS:
        offset = find_section_offset(full_text, section)
        found_sections.append({**section, "offset": offset})

    found_sections.sort(key=lambda item: item["offset"])

    included_sections: list[dict[str, Any]] = []

    for index, section in enumerate(found_sections):
        start_offset = section["offset"]
        end_offset = (
            found_sections[index + 1]["offset"]
            if index + 1 < len(found_sections)
            else len(full_text)
        )

        if not section["include"]:
            continue

        section_text = full_text[start_offset:end_offset]
        section_text = re.sub(r"\[\[PAGE \d+\]\]", "", section_text)
        section_text = normalise_text(section_text)

        included_sections.append(
            {
                "section_title": section["name"],
                "topic_id": section["topic_id"],
                "content_type": section["content_type"],
                "retrievable": section["retrievable"],
                "include_in_default_retrieval": section["include_in_default_retrieval"],
                "page_number": estimate_page_number(full_text, start_offset),
                "text": section_text,
            }
        )

    return included_sections


def chunk_section_text(
    section: dict[str, Any],
    max_chars: int = 1600,
    overlap_chars: int = 200,
) -> list[dict[str, Any]]:
    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n\s*\n", section["text"])
        if paragraph.strip()
    ]

    chunks: list[dict[str, Any]] = []
    current = ""

    for paragraph in paragraphs:
        if not current:
            current = paragraph
            continue

        if len(current) + len(paragraph) + 2 <= max_chars:
            current += "\n\n" + paragraph
        else:
            chunks.append({**section, "content": current.strip()})

            overlap = current[-overlap_chars:] if len(current) > overlap_chars else current
            current = paragraph

    if current.strip():
        chunks.append({**section, "content": current.strip()})

    return chunks


def get_or_create_source_document_id() -> str:
    existing = (
        supabase.table("source_documents")
        .select("id")
        .eq("title", SOURCE_DOCUMENT["title"])
        .eq("version", SOURCE_DOCUMENT["version"])
        .execute()
    )

    if existing.data:
        document_id = existing.data[0]["id"]

        supabase.table("document_chunks").delete().eq("document_id", document_id).execute()
        return document_id

    inserted = supabase.table("source_documents").insert(SOURCE_DOCUMENT).execute()

    return inserted.data[0]["id"]


def build_knowledge_base() -> None:
    print(f"Reading PDF: {PDF_PATH}")
    full_text = extract_pdf_text_with_page_markers(PDF_PATH)

    print("Splitting document into curated sections...")
    sections = split_into_sections(full_text)

    all_chunks: list[dict[str, Any]] = []

    for section in sections:
        section_chunks = chunk_section_text(section)
        all_chunks.extend(section_chunks)

        print(
            f"- {section['section_title']}: "
            f"{len(section_chunks)} chunks "
            f"(topic_id={section['topic_id']}, content_type={section['content_type']})"
        )

    print(f"Total chunks prepared: {len(all_chunks)}")

    document_id = get_or_create_source_document_id()
    print(f"Using source document id: {document_id}")

    for index, chunk in enumerate(all_chunks):
        content = chunk["content"]

        print(f"Embedding chunk {index + 1}/{len(all_chunks)}: {chunk['section_title']}")

        embedding = create_embedding(content)

        metadata = {
            "content_type": chunk["content_type"],
            "retrievable": chunk["retrievable"],
            "include_in_default_retrieval": chunk["include_in_default_retrieval"],
            "source_section": chunk["section_title"],
            "source_title": SOURCE_DOCUMENT["title"],
            "source_version": SOURCE_DOCUMENT["version"],
        }

        record = {
            "document_id": document_id,
            "topic_id": chunk["topic_id"],
            "section_title": chunk["section_title"],
            "page_number": chunk["page_number"],
            "chunk_index": index,
            "content": content,
            "embedding": embedding,
            "metadata": metadata,
        }

        supabase.table("document_chunks").insert(record).execute()

        time.sleep(0.2)

    print("Knowledge base build complete.")


if __name__ == "__main__":
    build_knowledge_base()