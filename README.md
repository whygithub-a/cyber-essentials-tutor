# Cyber Essentials Intelligent Tutoring System

This project is a web-based intelligent tutoring prototype designed to support learning of the Cyber Essentials requirements. It combines document-based learning, retrieval-augmented AI tutoring, open-ended formative assessment, and lightweight gamified progress tracking.

The system is intended for educational use only. It is not an official Cyber Essentials certification platform and does not make compliance decisions.

## Overview

The prototype helps learners study Cyber Essentials by providing:

* Section-based navigation through the Cyber Essentials requirements PDF.
* An AI tutor that answers questions using retrieved Cyber Essentials content.
* Scenario-based formative assessment questions.
* AI-generated feedback based on rubrics and retrieved source material.
* Question-level progress tracking.
* Gamified progress indicators, including mastery percentage, XP and badges.
* A privacy and usage notice shown when the user opens the application.

The system is designed as a learning support tool rather than a compliance auditing or certification decision system.

## Main Features

### PDF-Based Learning Interface

The central panel displays the Cyber Essentials requirements document as an embedded PDF. Users can select learning sections from the left-side menu, and the PDF opens at the relevant page.

Current learning sections include:

* Definitions
* Scope
* Firewalls
* Secure Configuration
* Security Update Management
* User Access Control
* Malware Protection

### AI Tutor

The AI Tutor allows users to ask Cyber Essentials-related questions. The backend retrieves relevant chunks from the Cyber Essentials knowledge base and uses Azure OpenAI to generate a grounded educational response.

The tutor is instructed to:

* Use retrieved Cyber Essentials context where possible.
* Provide clear learner-friendly explanations.
* Avoid making official certification or compliance decisions.
* Show source information where relevant.

### Formative Assessment

The Assessment module provides open-ended scenario-based questions for the five Cyber Essentials technical control themes:

* Firewalls
* Secure Configuration
* Security Update Management
* User Access Control
* Malware Protection

Each question is linked to a rubric stored in the database. When a learner submits an answer, the backend retrieves the relevant question, rubric and document context, then uses Azure OpenAI to generate structured formative feedback.

Feedback includes:

* Score
* Strengths
* Missing points
* Formative feedback
* Retrieved sources used

Assessment scores are for learning purposes only and should not be interpreted as certification results.

### Assessment Navigation

The assessment interface supports:

* `Retry Question` — clears the current answer and feedback so the learner can attempt the same question again.
* `Previous Question` — loads the previous question in the current topic.
* `Next Question` — loads the next question after feedback has been shown.
* Question numbering, such as `Question 1 of 3`.

The system also uses the learner’s anonymous browser session ID to return them to the first unanswered question in a topic when they navigate away and return later.

### Gamified Progress Tracking

Progress is tracked at the question-attempt level. Each submitted answer creates an attempt record containing:

* Session ID
* Topic ID
* Question ID
* Score
* Maximum score
* Timestamp

Progress is calculated using the best score achieved for each question, rather than only the most recent score. This prevents a later poor attempt from overwriting a previous stronger attempt.

For each topic, the system calculates:

* Knowledge score, such as `10/15`
* Mastery percentage
* XP
* Badge level

Current badge levels include:

* Not Started
* Started
* Bronze
* Silver
* Gold
* Mastered

The left-side dashboard displays overall mastery, total XP, total knowledge score, attempted questions and badge counts.

### Privacy and Usage Notice

When users open the application, a modal notice explains that:

* The system is a learning prototype.
* It is not an official certification platform.
* Users should not enter real sensitive information.
* Questions and assessment answers are processed to generate AI responses and feedback.
* Raw chat transcripts and raw assessment answer text are not stored in the application database.
* A random browser session ID is used to store limited progress metadata.

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* React Bootstrap
* Browser localStorage for anonymous session ID storage

The frontend is responsible for:

* Rendering the three-column learning interface.
* Displaying the Cyber Essentials PDF.
* Managing AI Tutor and Assessment tabs.
* Sending user questions and assessment answers to the backend.
* Displaying formative feedback and retrieved sources.
* Displaying gamified progress data.

### Backend

* Python
* FastAPI
* Pydantic
* Supabase Python client
* Azure OpenAI SDK

The backend provides API routes for:

* Health checks
* AI tutor responses
* Assessment question retrieval
* Assessment answer submission
* Progress tracking and gamification

### Database and Storage

* Supabase PostgreSQL
* Supabase RPC for vector similarity search
* Document chunks stored in Supabase
* Assessment questions and rubrics stored in relational tables
* Assessment attempts stored for progress tracking

Important tables include:

* `assessment_questions`
* `rubrics`
* `assessment_attempts`
* `progress_sessions`
* document chunk tables used for retrieval

The current progress system uses `assessment_attempts` as the main source of truth. The older `progress_sessions` table may still exist but is not the main basis for mastery calculation.

### AI Services

* Azure OpenAI chat deployment for AI tutor responses and assessment feedback
* Azure OpenAI embedding deployment for retrieval queries

The system uses retrieval-augmented generation. User questions and assessment answers are combined with relevant Cyber Essentials document chunks before being sent to the AI model.

### Deployment

* Frontend: Vercel
* Backend: Render
* Database: Supabase
* Source control: GitHub

The frontend and backend can be connected to the GitHub repository so that pushes to the main branch trigger redeployment, depending on the deployment settings.

## System Architecture

The system follows a client-server architecture.

```text
User Browser
   |
   | React + TypeScript frontend
   |
FastAPI Backend
   |
   |-- Supabase PostgreSQL
   |     |-- document chunks
   |     |-- assessment questions
   |     |-- rubrics
   |     |-- assessment attempts
   |
   |-- Azure OpenAI
         |-- embeddings
         |-- AI tutor responses
         |-- formative assessment feedback
```

## Main Backend Modules

### `assessment.py`

Handles assessment question loading and answer submission.

Key responsibilities:

* Retrieve active questions by topic.
* Support next and previous question navigation.
* Select the first unanswered question for a session.
* Return question position and total number of questions.
* Retrieve rubrics for submitted questions.
* Retrieve relevant document context.
* Generate formative AI feedback.

### `progress.py`

Handles gamified progress tracking.

Key responsibilities:

* Record assessment attempts.
* Calculate best score per question.
* Aggregate topic-level knowledge scores.
* Calculate overall mastery.
* Calculate XP.
* Assign badges.
* Return progress data to the frontend.

### Azure OpenAI integration

Handles:

* Embedding generation.
* Grounded AI tutor responses.
* Structured formative assessment feedback.

### Supabase client

Creates the Supabase client using environment variables.

## Environment Variables

The backend requires environment variables such as:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

AZURE_OPENAI_BASE_URL=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_CHAT_DEPLOYMENT=
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=
```

The frontend requires:

```env
VITE_API_BASE_URL=
```

Sensitive keys should not be committed to GitHub.

## Local Development

### Backend

From the project root:

```bash
python -m uvicorn main:app --reload --app-dir backend
```

The backend will usually run at:

```text
http://localhost:8000
```

### Frontend

From the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The frontend will usually run at:

```text
http://localhost:5173
```

### Frontend Build Test

```bash
cd frontend
npm run build
```

## Example API Routes

### AI Tutor

```text
POST /api/chat
```

### Load Assessment Question

```text
GET /api/assessment/question/{topic_id}
```

Supports query parameters such as:

```text
session_id
exclude_question_id
previous_question_id
```

### Submit Assessment Answer

```text
POST /api/assessment/submit
```

### Get Progress

```text
GET /api/progress/{session_id}
```

### Update Progress

```text
POST /api/progress/update
```

## Current Functional Scope

The current prototype supports:

1. Cyber Essentials PDF navigation.
2. AI tutoring grounded in retrieved Cyber Essentials content.
3. Open-ended formative assessment.
4. Rubric-based AI feedback.
5. Multiple questions per technical control topic.
6. Retry, previous and next question navigation.
7. Session-aware loading of unanswered questions.
8. Question numbering.
9. Question-level attempt recording.
10. Best-score-based progress calculation.
11. Knowledge score display.
12. XP and badge-based gamification.
13. Anonymous browser session tracking.
14. Privacy and usage warning modal.

## Limitations

This system is a prototype and has several limitations:

* It does not make official Cyber Essentials certification decisions.
* It does not replace a Certification Body.
* It does not collect or verify real organisational evidence.
* It does not perform vulnerability scanning or technical auditing.
* AI feedback is formative and may require human review.
* The assessment module is designed for learning, not compliance approval.
* The current assessment structure focuses on the five Cyber Essentials technical control themes.

## Educational Positioning

The system is designed to support cybersecurity compliance education by combining:

* Authoritative document-based learning
* Retrieval-augmented AI tutoring
* Open-ended scenario-based assessment
* Formative feedback
* Lightweight gamification

The goal is to help learners understand and apply Cyber Essentials concepts in context, while maintaining a clear boundary between educational support and official certification.
