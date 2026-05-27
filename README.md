# Cyber Essentials Intelligent Tutoring System

## Project Overview

This repository contains the software prototype for an MSc dissertation project. The project is an AI-supported Intelligent Tutoring System designed to help learners study the UK Cyber Essentials requirements.

The system provides a structured Cyber Essentials learning interface, a Retrieval-Augmented Generation based AI tutor, scenario-based assessment feedback, and anonymous progress tracking.

This prototype is for educational and research purposes only. It is not an official Cyber Essentials certification platform and does not provide official certification decisions, legal compliance advice, or professional cybersecurity consultancy.

## Project Aim

The aim of this project is to design, implement, and evaluate an AI-driven Intelligent Tutoring System that supports Cyber Essentials learning for small enterprise IT teams and non-specialist administrators.

The system focuses on the main Cyber Essentials learning sections:

- Definitions
- Scope
- Firewalls
- Secure Configuration
- Security Update Management
- User Access Control
- Malware Protection

The five technical control themes are used for assessment and progress tracking.

## Current Implementation Status

The current prototype includes the following working components.

### 1. PDF-Based Learning Interface

The frontend provides a section-based learning interface. Users can select a Cyber Essentials section and read the official PDF document inside the application.

The current section navigation includes:

- Definitions
- Scope
- Firewalls
- Secure Configuration
- Security Update Management
- User Access Control
- Malware Protection

### 2. RAG-Based AI Tutor

The system includes an AI tutor that answers user questions using Retrieval-Augmented Generation.

The implemented workflow is:

```text
User question
    ↓
Azure OpenAI embedding model
    ↓
Supabase pgvector similarity search
    ↓
Relevant Cyber Essentials document chunks
    ↓
Azure OpenAI chat model
    ↓
Grounded answer with source references
```

The system first uses the currently selected section as a retrieval hint. If the selected section does not provide sufficiently relevant results, the backend can perform wider retrieval across the Cyber Essentials knowledge base.

### 3. Knowledge Base and Vector Database

The Cyber Essentials requirements PDF is processed into curated document chunks.

The current knowledge base includes:

- Definitions
- Backing up your data
- Scope
- Firewalls
- Secure Configuration
- Security Update Management
- User Access Control
- Malware Protection

The `Further guidance` section is excluded from the first prototype to keep the knowledge base aligned with the core dissertation scope.

Embeddings are generated using Azure OpenAI and stored in Supabase PostgreSQL with pgvector.

### 4. Scenario-Based Assessment Module

The system includes a basic scenario-based assessment module for the five Cyber Essentials technical control themes.

The implemented workflow is:

```text
User selects a technical control theme
    ↓
System loads a scenario-based question
    ↓
User submits an open-ended answer
    ↓
Backend retrieves relevant Cyber Essentials context
    ↓
AI compares the answer against a predefined rubric
    ↓
System returns score, strengths, missing points, feedback and sources
```

The assessment is formative only. It does not provide an official Cyber Essentials certification result.

### 5. Anonymous Progress Tracking

The system includes basic progress tracking using an anonymous browser-based session identifier.

The progress dashboard currently records:

- Completed technical control assessments
- Latest assessment score
- Maximum score
- Basic badge status

The prototype does not require user accounts or login.

## System Architecture

The system follows a three-layer architecture:

```text
React Frontend
    ↓
FastAPI Backend
    ↓
Azure OpenAI + Supabase PostgreSQL / pgvector
```

### Frontend

The frontend is implemented using:

- React
- TypeScript
- Vite
- Bootstrap / React-Bootstrap

Frontend responsibilities include:

- Section navigation
- PDF reading interface
- AI tutor chat interface
- Assessment interface
- Progress dashboard

### Backend

The backend is implemented using:

- Python
- FastAPI
- Uvicorn
- Pydantic

Backend responsibilities include:

- API routing
- Azure OpenAI chat and embedding calls
- Supabase database access
- RAG retrieval
- Assessment feedback generation
- Progress tracking

### AI Services

The system uses Azure OpenAI:

- Chat deployment: `gpt-4o`
- Embedding deployment: `text-embedding-3-large`

### Database

The database uses Supabase PostgreSQL with pgvector.

Main database tables include:

- `topics`
- `source_documents`
- `document_chunks`
- `assessment_questions`
- `rubrics`
- `progress_sessions`

## Core API Endpoints

### Health Check

```text
GET /api/health
```

### Topics

```text
GET /api/topics
```

### AI Test

```text
POST /api/ai/test
```

### Retrieval Test

```text
POST /api/retrieval/test
```

### RAG Chat

```text
POST /api/chat
```

### Assessment

```text
GET  /api/assessment/question/{topic_id}
POST /api/assessment/submit
```

### Progress

```text
GET  /api/progress/{session_id}
POST /api/progress/update
```

## Local Development

### Backend

Activate the conda environment:

```bash
conda activate cyber-tutor
```

Start the backend from the project root:

```bash
python -m uvicorn main:app --reload --app-dir backend
```

The backend should run at:

```text
http://localhost:8000
```

The FastAPI documentation is available at:

```text
http://localhost:8000/docs
```

### Frontend

Install dependencies:

```bash
npm --prefix frontend install
```

Start the frontend:

```bash
npm --prefix frontend run dev
```

The frontend should run at:

```text
http://localhost:5173
```

## Environment Variables

Real API keys must not be committed to GitHub.

Create a local `.env` file in the project root based on `.env.example`.

Required variables:

```env
AZURE_OPENAI_BASE_URL=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_CHAT_DEPLOYMENT=
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_PUBLISHABLE_KEY=

FRONTEND_ORIGIN=http://localhost:5173
```

The `SUPABASE_SERVICE_ROLE_KEY` must only be used by the backend. It must not be exposed in frontend code.

## Knowledge Base Construction

The knowledge base builder is located at:

```text
backend/scripts/build_knowledge_base.py
```

It reads the Cyber Essentials PDF from a local source document folder, extracts curated sections, generates embeddings and inserts chunks into Supabase.

The source PDF is treated as a local development file and should not be committed unless explicitly required for deployment.

## Privacy and Evaluation Design

The prototype does not require login or named user accounts.

Progress is tracked using an anonymous browser session identifier stored in local browser storage. The system is designed to avoid collecting unnecessary personal or organisational data during evaluation.

The prototype should not collect:

- Names
- Email addresses
- Company names
- Real infrastructure details
- Credentials
- Confidential system configurations
- Identifiable user profiles

Research evaluation data should be collected separately through an anonymous questionnaire.

## Academic Scope

This project is a dissertation prototype. Its purpose is to explore how AI tutoring, retrieval-augmented generation, formative assessment and lightweight progress tracking can support Cyber Essentials learning.

The system is not intended to replace official Cyber Essentials documentation, certification assessment, or professional cybersecurity advice.

## Current Development Stage

The core local prototype is implemented.

Remaining work includes:

- Interface polishing
- Deployment preparation
- User evaluation preparation
- Dissertation system design documentation
- Testing and limitation analysis