# Cyber Essentials Intelligent Tutoring System

This project is a web-based intelligent tutoring prototype designed to support learning of the Cyber Essentials requirements. It combines document-based learning, retrieval-augmented AI tutoring, open-ended formative assessment, personalised weakness review, and lightweight gamified progress tracking.

The system is intended for educational use only. It is not an official Cyber Essentials certification platform and does not make compliance decisions.

## Overview

The prototype helps learners study Cyber Essentials by providing:

* Section-based navigation through the Cyber Essentials requirements PDF.
* An AI tutor that answers questions using retrieved Cyber Essentials content.
* Scenario-based formative assessment questions.
* AI-generated feedback based on rubrics and retrieved source material.
* Question-level progress tracking.
* A personalised weak points summary based on missing rubric points.
* Gamified progress indicators, including mastery percentage, XP and badges.
* A privacy and usage notice shown when the user opens the application.

The system is designed as a learning support tool rather than a compliance auditing or certification decision system.

## Main Features

### Prototype Notice Modal

When the application opens, users are shown a mandatory notice explaining the purpose and limitations of the system. The notice must be manually closed before the user continues.

The notice informs users that:

* The system is a learning prototype.
* It is not an official Cyber Essentials certification platform.
* It does not make compliance decisions.
* Users should not enter real sensitive information.
* User questions and assessment answers are processed to generate AI tutor responses and formative feedback.
* Raw chat transcripts and raw assessment answer text are not stored in the application database.
* A random browser session ID is used to save limited progress metadata.
* Assessment scores and AI feedback are for formative learning use only.

This supports the privacy, transparency and ethical boundaries of the prototype.

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

The tutor is designed to:

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

### Weak Points Summary

The system includes a dedicated `Weak Points` tab that summarises the learner’s current weak areas across the assessment topics.

After each assessment submission, the system stores the score, strengths and missing rubric points. The Weak Points Summary uses the learner’s best attempt for each question. If a question’s best attempt is not full marks, the missing points from that best attempt are included in the summary. If the learner later retries the question and achieves full marks, that question is removed from the weak points list.

The Weak Points Summary displays:

* Topic name
* Question number
* Best score
* Missing rubric points to review
* A topic review button

This feature helps learners identify recurring gaps across the system instead of only seeing feedback for one question at a time.

### Gamified Progress Tracking

Progress is tracked at the question-attempt level. Each submitted answer creates an attempt record containing:

* Session ID
* Topic ID
* Question ID
* Score
* Maximum score
* Strengths
* Missing points
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
* Managing the AI Tutor, Assessment and Weak Points tabs.
* Displaying the prototype notice modal.
* Sending user questions and assessment answers to the backend.
* Displaying formative feedback and retrieved sources.
* Displaying gamified progress data.
* Displaying weak points derived from missing rubric points.

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
* Weak points summary generation

### Database and Storage

* Supabase PostgreSQL
* Supabase RPC for vector similarity search
* Document chunks stored in Supabase
* Assessment questions and rubrics stored in relational tables
* Assessment attempts stored for progress and weak points tracking

Important tables include:

* `assessment_questions`
* `rubrics`
* `assessment_attempts`
* `progress_sessions`
* document chunk tables used for retrieval

The current progress and weak points systems use `assessment_attempts` as the main source of truth. The older `progress_sessions` table may still exist but is not the main basis for mastery calculation.

### AI Services

* Azure OpenAI chat deployment for AI tutor responses and assessment feedback
* Azure OpenAI embedding deployment for retrieval queries

The system uses retrieval-augmented generation. User questions and assessment answers are combined with relevant Cyber Essentials document chunks before being sent to the AI model.

### Deployment

* Frontend: Vercel
* Backend: Render
* Database: Supabase
* Source control: GitHub

The frontend and backend can be connected to the GitHub repository so that pushes to the main branch trigger redeployment, depending on the deployment platform settings.

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

Handles gamified progress tracking and weak points summary generation.

Key responsibilities:

* Record assessment attempts.
* Store scores, strengths and missing points.
* Calculate best score per question.
* Aggregate topic-level knowledge scores.
* Calculate overall mastery.
* Calculate XP.
* Assign badges.
* Identify weak questions from best attempts that are not full marks.
* Return a personalised weak points summary.

### Azure OpenAI Integration

Handles:

* Embedding generation.
* Grounded AI tutor responses.
* Structured formative assessment feedback.

### Supabase Client

Creates the Supabase client using environment variables.

## Database Structure

### `assessment_questions`

Stores the open-ended assessment questions.

Important fields include:

```text
id
topic_id
question_text
scenario_context
difficulty
is_active
question_order
official_ref
source_title
adaptation_note
```

### `rubrics`

Stores the expected marking points for each assessment question.

Important fields include:

```text
id
question_id
max_score
expected_points
```

### `assessment_attempts`

Stores question-level assessment attempts.

Important fields include:

```text
id
session_id
topic_id
question_id
score
max_score
missing_points
strengths
created_at
```

This table is used for both progress calculation and weak points summary generation.

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

### Get Weak Points Summary

```text
GET /api/progress/weaknesses/{session_id}
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
15. Weak points summary based on missing rubric points.
16. Topic review navigation from the Weak Points tab.

## Limitations

This system is a prototype and has several limitations:

* It does not make official Cyber Essentials certification decisions.
* It does not replace a Certification Body.
* It does not collect or verify real organisational evidence.
* It does not perform vulnerability scanning or technical auditing.
* AI feedback is formative and may require human review.
* The assessment module is designed for learning, not compliance approval.
* The current assessment structure focuses on the five Cyber Essentials technical control themes.
* The Weak Points Summary depends on stored assessment feedback and is most useful after the learner has submitted several assessment attempts.

## Educational Positioning

The system is designed to support cybersecurity compliance education by combining:

* Authoritative document-based learning
* Retrieval-augmented AI tutoring
* Open-ended scenario-based assessment
* Formative feedback
* Personalised weak points review
* Lightweight gamification

The goal is to help learners understand and apply Cyber Essentials concepts in context, while maintaining a clear boundary between educational support and official certification.
