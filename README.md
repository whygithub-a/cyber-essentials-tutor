# Cyber Essentials Intelligent Tutoring System

## Project Overview

This repository contains the software prototype for an MSc dissertation project. The project is an AI-based Intelligent Tutoring System designed to support Cyber Essentials learning for small enterprise IT teams and non-specialist administrators.

The system is intended to help users study Cyber Essentials topics, ask contextual questions through an AI tutor, complete scenario-based assessments, and receive formative feedback.

This prototype is for educational and research purposes only. It is not an official Cyber Essentials certification platform and does not provide official certification decisions, legal compliance advice, or professional cybersecurity consultancy.

## Project Aim

The aim of this project is to design, implement, and evaluate an AI-driven Intelligent Tutoring System that provides accessible and engaging cybersecurity compliance learning support based on the UK Cyber Essentials framework.

The system focuses on five Cyber Essentials technical control themes:

- Firewalls
- Secure Configuration
- Security Update Management
- User Access Control
- Malware Protection

## Core Requirements

The prototype is designed around four main software requirements:

1. **Knowledge Base**  
   Construct a structured dataset and vector database based on NCSC Cyber Essentials documentation.

2. **Conversational Interface**  
   Develop a chatbot-style learning interface that allows users to ask natural language questions during study.

3. **Assessment Module**  
   Provide scenario-based questions to test user understanding and generate formative feedback.

4. **User Progress Tracking**  
   Provide a basic dashboard to visualise learning progress, topic completion, and assessment outcomes.

## Proposed System Architecture

The system follows a three-layer architecture:

```text
Frontend Interface Layer
        ↓
FastAPI Backend / Tutoring and AI Layer
        ↓
Knowledge Base, Vector Database and Progress Data Layer
```

### Frontend Interface Layer

The frontend provides the user-facing learning environment. It will include:

- A sidebar for Cyber Essentials topic navigation
- A main learning content area
- An AI tutor chat panel
- A scenario-based assessment area
- A basic progress dashboard

### Backend / AI Layer

The backend is implemented using FastAPI. It will handle:

- API requests from the React frontend
- Calls to Azure OpenAI
- Retrieval-Augmented Generation workflow
- Assessment feedback generation
- Progress updates using anonymous session identifiers

### Knowledge and Data Layer

The knowledge layer will use a database-backed approach rather than static JSON files. The planned database design uses PostgreSQL with vector search support.

The knowledge base will include:

- Cyber Essentials topics
- Source document metadata
- Document chunks
- Embedding vectors
- Assessment questions
- Rubrics
- Anonymous progress records

## RAG Design

The AI tutor will not operate as an unrestricted general chatbot. It will use a Retrieval-Augmented Generation workflow.

The planned RAG process is:

```text
User question
    ↓
Question is converted into an embedding
    ↓
Relevant Cyber Essentials document chunks are retrieved from the vector database
    ↓
Retrieved chunks are inserted into a grounded prompt
    ↓
Azure OpenAI generates a response based on the retrieved context
    ↓
The response is returned with source references where possible
```

This design is intended to improve traceability and reduce unsupported AI-generated answers.

## Assessment Design

The assessment module will use scenario-based open-ended questions rather than simple multiple-choice quizzes.

The planned assessment process is:

```text
User submits an answer
    ↓
The system retrieves relevant Cyber Essentials reference material
    ↓
The answer is compared against a predefined rubric
    ↓
Azure OpenAI generates structured formative feedback
    ↓
The user receives a score, strengths, missing points, and suggested improvements
```

The assessment module is designed to support learning. It does not provide official certification decisions.

## Privacy and Evaluation Design

The system will not require user accounts during evaluation.

The prototype will use anonymous session cookies or local browser storage to support basic progress tracking. These identifiers are intended only to maintain session-level progress and are not used to identify participants personally.

During participant evaluation, the system should not collect:

- Names
- Email addresses
- Company names
- Real IP addresses or infrastructure details
- Credentials
- Employee information
- Confidential system configurations
- Identifiable user profiles
- Participant chat logs

Research data should be collected through an anonymous questionnaire.

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Bootstrap / React-Bootstrap

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic

### AI Services

- Azure OpenAI
- Chat model deployment: `gpt-4o`
- Embedding model deployment: planned

### Database

- Supabase PostgreSQL
- pgvector extension for vector similarity search

### Planned Deployment

- GitHub for source code management
- Vercel for frontend hosting
- Render for FastAPI backend hosting
- Supabase for database and vector storage
- Azure OpenAI for AI model access

## Current Implementation Status

The current implementation includes:

- Initial GitHub repository setup
- React + TypeScript + Vite frontend scaffold
- FastAPI backend scaffold
- A backend health-check endpoint
- A frontend-backend connection test
- Successful local connection between the React frontend and FastAPI backend

Current local test result:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Status:   Backend connected successfully
```

The next development phase will focus on:

1. Deploying an Azure OpenAI embedding model
2. Creating the Supabase PostgreSQL database
3. Enabling pgvector
4. Designing database tables for topics, document chunks, questions, rubrics, and progress
5. Building the Cyber Essentials knowledge base
6. Implementing RAG-based tutoring
7. Implementing scenario-based assessment and feedback

## Project Structure

```text
cyber-essentials-tutor/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── app/
│       ├── api/
│       ├── core/
│       ├── rag/
│       ├── assessment/
│       └── models/
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

## Local Development

### Backend

Activate the conda environment:

```bash
conda activate cyber-tutor
```

Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Start the FastAPI backend:

```bash
python -m uvicorn main:app --reload
```

The backend should run locally at:

```text
http://localhost:8000
```

The health-check endpoint is:

```text
http://localhost:8000/api/health
```

### Frontend

Install frontend dependencies:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend should run locally at:

```text
http://localhost:5173
```

## Environment Variables

This project uses Azure OpenAI and will later use Supabase. Real API keys must not be committed to GitHub.

A local `.env` file should be created based on `.env.example`.

Example variables:

```env
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_CHAT_DEPLOYMENT=
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

FRONTEND_ORIGIN=http://localhost:5173
```

## Academic Scope

This project is a dissertation prototype. The purpose is to explore how AI, retrieval-augmented generation, formative assessment, and lightweight progress tracking can be combined in an Intelligent Tutoring System for Cyber Essentials learning.

The system is not intended to replace official Cyber Essentials documentation, certification assessment, or professional cybersecurity advice.

## Current Status

This project is under active development.