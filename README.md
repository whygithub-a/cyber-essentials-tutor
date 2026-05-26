# Cyber Essentials Intelligent Tutoring System

## Project Overview

This project is an AI-based Intelligent Tutoring System prototype for Cyber Essentials training.

The system is designed to help users study Cyber Essentials topics, ask questions through an AI tutor, complete scenario-based assessments, and receive formative feedback.

This prototype is for educational purposes only. It is not an official Cyber Essentials certification platform and does not provide official certification decisions.

## Main Features

- Cyber Essentials learning topics
- AI tutor for contextual questions
- Retrieval-Augmented Generation based on official guidance
- Scenario-based assessment
- Rubric-guided formative feedback
- Lightweight progress display
- Privacy-preserving evaluation mode

## Technology Stack

### Frontend

- React
- TypeScript
- Bootstrap / React-Bootstrap

### Backend

- Python
- FastAPI
- Azure OpenAI API

### AI Components

- Azure OpenAI chat model for tutoring and feedback
- Azure OpenAI embedding model for document retrieval
- Retrieval-Augmented Generation based on Cyber Essentials document chunks

## Project Structure

```text
cyber-essentials-tutor/
├── frontend/
├── backend/
├── docs/
├── .gitignore
├── .env.example
└── README.md
```

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

For Windows, activate the virtual environment with:

```bash
.venv\Scripts\activate
```

The backend should run locally at:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend should run locally at:

```text
http://localhost:3000
```

## Environment Variables

This project uses Azure OpenAI. Real API keys must not be committed to GitHub.

Create a local `.env` file based on `.env.example`.

```env
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_CHAT_DEPLOYMENT=
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=
```

## Privacy and Ethical Boundaries

This prototype is designed for educational evaluation only.

The system should not collect real company names, credentials, employee information, confidential system configurations, or identifiable participant data.

The system should not store participant chat logs during evaluation. Research data should be collected through an anonymous questionnaire.

## Current Status

This project is currently under development.
