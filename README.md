# Cyber Essentials Intelligent Tutoring System

This project is a web-based intelligent tutoring prototype designed to support learning and preparation around the Cyber Essentials requirements. It combines PDF-based learning, retrieval-augmented AI tutoring, open-ended formative assessment, personalised weak-points review, lightweight gamified progress tracking, and a shortened SME-oriented readiness consultation feature.

The system is intended for educational and formative preparation use only. It is not an official Cyber Essentials certification platform, does not replace a Certification Body, and does not make official compliance decisions.

## Overview

The prototype helps users study and reflect on Cyber Essentials by providing:

* Section-based navigation through the Cyber Essentials requirements PDF.
* An AI tutor that answers questions using retrieved Cyber Essentials content.
* Open-ended scenario-based formative assessment questions.
* AI-generated assessment feedback based on rubrics and retrieved source material.
* Question-level progress tracking.
* A personalised weak-points summary based on missing rubric points.
* A shortened Cyber Essentials readiness consultation workflow for small organisations.
* Help guidance for consultation questions and report clarification questions.
* Follow-up AI help inside consultation explanation dialogs.
* Gamified progress indicators, including mastery percentage, XP and badges.
* A privacy and usage notice shown when the user opens the application.

The system is designed as a learning and preparation support tool rather than a compliance auditing or certification decision system.

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
* Keep the user within the learning and formative-support purpose of the prototype.

The AI Tutor conversation panel automatically scrolls to the start of each new AI response. This improves usability during longer conversations because users do not need to manually scroll down to find the latest answer.

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

The system also uses the learner's anonymous browser session ID to return them to the first unanswered question in a topic when they navigate away and return later.

### Weak Points Summary

The system includes a dedicated `Weak Points` tab that summarises the learner's current weak areas across the assessment topics.

After each assessment submission, the system stores the score, strengths and missing rubric points. The Weak Points Summary uses the learner's best attempt for each question. If a question's best attempt is not full marks, the missing points from that best attempt are included in the summary. If the learner later retries the question and achieves full marks, that question is removed from the weak points list.

The Weak Points Summary displays:

* Topic name
* Question number
* Best score
* Missing rubric points to review
* A topic review button

This feature helps learners identify recurring gaps across the system instead of only seeing feedback for one question at a time.

### Consultation

The system includes a `Consultation` tab that provides a shortened Cyber Essentials readiness consultation workflow for small organisations.

This feature is designed for users such as small business founders or non-specialist administrators who want to understand possible Cyber Essentials readiness gaps before seeking official certification or professional consultancy support.

The consultation feature is based on a shortened set of core readiness questions covering:

* Organisation and scope
* Devices and cloud services
* Firewalls
* Secure Configuration
* Security Update Management
* User Access Control
* Malware Protection

The workflow asks 15 lightweight questions instead of reproducing the full official self-assessment questionnaire. This is intentional: the goal is to provide formative readiness guidance, not to duplicate the official Cyber Essentials assessment process.

After the user submits the consultation form, the system generates a readiness report containing:

* Overall readiness level
* Short readiness summary
* Likely strengths
* Potential gaps
* Severity level for each gap
* Why each issue matters
* Recommended actions
* Recommended next steps
* Retrieved sources used
* Clarification questions, where further information would improve the report

The consultation feature does not save the user's raw consultation input to the application database. The report is generated temporarily in the browser session and is intended only as formative readiness guidance.

The consultation feature does not use Cyber Essentials Plus test specifications and does not perform technical testing, auditing, scanning or formal pass/fail assessment.

### Consultation Help: Help me understand

The consultation form includes `Help me understand` buttons beside the consultation questions. These buttons open an explanation dialog that helps users understand what each question is asking.

Each explanation includes:

* A plain-language explanation of the question.
* Why the question matters.
* How the user can answer it.
* A small-business example.

The explanation design avoids repeated privacy warnings inside every question to keep the interface readable. Privacy and sensitive-data guidance is still provided in the application-level prototype notice and through relevant input placeholders.

Inside the help dialog, users can also ask follow-up questions. The AI follow-up assistant is limited to explaining the consultation question and helping the user understand the answer options. It should not complete the form on behalf of the user, request sensitive details, or make official compliance decisions.

Help conversations are stored only in frontend state while the page remains open. They are not saved to the database or localStorage. Closing and reopening the help dialog does not clear the current question's help conversation, but refreshing the page clears it naturally.

The help dialog also includes a manual `Clear conversation` option so users can remove the temporary help conversation for the current question.

### Clarification Questions in the Consultation Report

The consultation report may include `Questions to clarify`. These questions are dynamically selected by backend rule-based logic from a predefined set, based on the potential gaps identified in the consultation answers.

They are not freely generated by the language model. This makes the follow-up process more predictable, explainable and aligned with the Cyber Essentials control areas.

Users can answer one or more clarification questions and regenerate the report. Answered clarification questions are then removed from the visible list, preventing an endless question loop.

Each clarification question also includes a `Help me understand` button. The clarification help content is mapped to the predefined clarification questions, so each clarification question can have its own fixed explanation, including:

* What the clarification question means.
* Why that clarification matters.
* How the user can answer in general terms.
* A suitable small-business example.

The clarification help feature is designed to support understanding, not to provide official compliance advice.

### Automatic Scrolling in AI Conversations

The AI Tutor and consultation help dialogs automatically move to the start of the latest AI response after a response is generated.

This improves usability in longer conversations. Instead of needing to manually scroll through the chat area, users are taken directly to the newly generated AI answer.

### Gamified Progress Tracking

Progress is tracked at the question-attempt level. Each submitted assessment answer creates an attempt record containing:

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
* Managing the AI Tutor, Assessment, Weak Points and Consultation tabs.
* Displaying the prototype notice modal.
* Sending user questions and assessment answers to the backend.
* Displaying formative feedback and retrieved sources.
* Displaying gamified progress data.
* Displaying weak points derived from missing rubric points.
* Rendering the shortened consultation form and readiness report.
* Managing temporary consultation help conversations in frontend state.
* Automatically scrolling AI conversation panels to new AI responses.

### Backend

* Python
* FastAPI
* Pydantic
* Supabase Python client
* Azure OpenAI / OpenAI-compatible client configuration

The backend provides API routes for:

* Health checks
* AI tutor responses
* Assessment question retrieval
* Assessment answer submission
* Progress tracking and gamification
* Weak points summary generation
* Consultation readiness analysis
* Consultation field explanation support

### Database and Storage

* Supabase PostgreSQL
* Supabase RPC for vector similarity search
* Document chunks stored in Supabase
* Assessment questions and rubrics stored in relational tables
* Assessment attempts stored for progress and weak-points tracking

Important tables include:

* `assessment_questions`
* `rubrics`
* `assessment_attempts`
* `progress_sessions`
* Document chunk tables used for retrieval

The current progress and weak-points systems use `assessment_attempts` as the main source of truth. The older `progress_sessions` table may still exist but is not the main basis for mastery calculation.

The consultation feature does not require a new database table in the current implementation because raw consultation input and raw consultation help conversations are not stored.

### AI Services

* Azure OpenAI chat deployment for AI tutor responses, assessment feedback, consultation summaries and consultation help responses.
* Azure OpenAI embedding deployment for retrieval queries.

The system uses retrieval-augmented generation. User questions, assessment answers and consultation context are combined with relevant Cyber Essentials document chunks before being sent to the AI model.

The consultation `Help me understand` feature uses AI for follow-up explanations inside the help dialog. Static explanations are predefined in the frontend, while AI follow-up responses are generated by the backend.

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
   |-- Azure OpenAI / OpenAI-compatible endpoint
         |-- embeddings
         |-- AI tutor responses
         |-- formative assessment feedback
         |-- consultation readiness summaries
         |-- consultation help responses
```

## Main Backend Modules

### `chat.py`

Handles AI tutor question answering.

Key responsibilities:

* Receive user questions.
* Retrieve relevant Cyber Essentials document chunks.
* Generate grounded educational responses.
* Return source information to the frontend.

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

Handles gamified progress tracking and weak-points summary generation.

Key responsibilities:

* Record assessment attempts.
* Store scores, strengths and missing points.
* Calculate best score per question.
* Aggregate topic-level knowledge scores.
* Calculate overall mastery.
* Calculate XP.
* Assign badges.
* Identify weak questions from best attempts that are not full marks.
* Return a personalised weak-points summary.

### `consultation.py`

Handles shortened Cyber Essentials readiness consultation analysis.

Key responsibilities:

* Receive structured consultation answers.
* Evaluate potential readiness gaps using rule-based logic.
* Generate likely strengths and potential gaps.
* Generate a readiness level.
* Retrieve relevant Cyber Essentials document chunks.
* Use Azure OpenAI to generate a concise readiness summary.
* Return clarification questions for the initial report.
* Support report regeneration when users provide clarification details.
* Provide AI follow-up explanations for consultation fields through the help dialog.

The consultation module is designed to provide formative readiness guidance only. It does not make certification decisions and does not perform technical auditing.

### Azure OpenAI Integration

Handles:

* Embedding generation.
* Grounded AI tutor responses.
* Structured formative assessment feedback.
* Consultation readiness summaries.
* Consultation help responses.

The chat configuration supports an Azure OpenAI base URL style configuration through `AZURE_OPENAI_BASE_URL`. Depending on deployment configuration, endpoint-style Azure OpenAI variables may also be used.

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

This table is used for both progress calculation and weak-points summary generation.

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

Depending on the Azure OpenAI configuration, the backend may also use:

```env
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_DEPLOYMENT_NAME=
```

Example backend configuration using an OpenAI-compatible Azure base URL:

```env
AZURE_OPENAI_BASE_URL=https://your-resource-name.openai.azure.com/openai/v1
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=your-chat-deployment-name
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=your-embedding-deployment-name
```

The frontend requires:

```env
VITE_API_BASE_URL=
```

Example local frontend configuration:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Sensitive keys should not be committed to GitHub.

## Local Development

### Backend

From the project root:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend will usually run at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

Expected response:

```json
{"status":"ok"}
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

### Health Check

```text
GET /api/health
```

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

### Generate Consultation Report

```text
POST /api/consultation/analyse
```

### Explain Consultation Field

```text
POST /api/consultation/explain-field
```

This endpoint supports the `Help me understand` follow-up feature in the consultation interface. It receives the consultation field context, the user's follow-up question and recent temporary help messages, then returns a concise explanatory response.

## Privacy and Data Handling

The prototype is designed to minimise unnecessary data storage.

### Stored

The system stores limited progress-related metadata, including:

* Anonymous browser session ID
* Topic ID
* Question ID
* Score
* Maximum score
* Strengths
* Missing points
* Timestamp

This data supports progress restoration, mastery calculation, XP, badges and weak-points review.

### Not Stored in the Application Database

The current implementation does not store:

* Raw AI Tutor chat transcripts
* Raw assessment answer text
* Raw consultation form input
* Raw consultation help conversations
* Raw clarification question help conversations

Consultation help conversations are held temporarily in frontend state while the page remains open. They are cleared naturally when the page is refreshed.

### Sensitive Information Warning

Users are instructed not to enter:

* Real company names
* Employee names
* IP addresses
* Usernames
* Passwords
* Credentials
* Internal hostnames
* Detailed firewall rules
* Confidential configurations
* Customer data
* Screenshots containing sensitive information

The system is intended for learning and formative reflection, not for processing real confidential organisational data.

## Important Limitations

This prototype:

* Is not an official Cyber Essentials certification platform.
* Does not replace a Certification Body.
* Does not make official compliance decisions.
* Does not provide professional legal, security or compliance advice.
* Does not perform technical scanning or auditing.
* Does not implement Cyber Essentials Plus testing.
* Does not guarantee that an organisation will pass or fail certification.
* Uses a shortened consultation workflow rather than the full official self-assessment questionnaire.
* Uses AI-generated explanations that should be interpreted as learning support only.

## Research and Evaluation Context

This project is designed as a dissertation prototype for exploring how an intelligent tutoring system can support Cyber Essentials learning and readiness preparation.

The system combines:

* Educational content navigation.
* Retrieval-augmented AI explanations.
* Formative assessment.
* Progress tracking and gamification.
* Weak-points review.
* SME-oriented readiness consultation.
* Explainable help for consultation questions and clarification questions.

The evaluation focus is on usability, learning support, perceived usefulness, transparency and whether the prototype helps users better understand Cyber Essentials control areas.

## Repository Structure

A simplified repository structure is shown below:

```text
.
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- app/
|       |-- api/
|       |   |-- chat.py
|       |   |-- assessment.py
|       |   |-- progress.py
|       |   |-- consultation.py
|       |-- core/
|           |-- azure_openai.py
|           |-- supabase_client.py
|
|-- frontend/
|   |-- package.json
|   |-- src/
|       |-- App.tsx
|       |-- components/
|           |-- ConsultationTab.tsx
|
|-- README.md
```

## Current Status

The current prototype includes:

* PDF-based Cyber Essentials learning.
* RAG-based AI Tutor.
* Open-ended formative assessment.
* AI-generated assessment feedback.
* Question-level progress tracking.
* XP, mastery percentage and badge indicators.
* Weak-points summary based on best attempts.
* Shortened SME readiness consultation.
* Rule-based consultation gap detection.
* AI-generated consultation summaries.
* Predefined clarification questions selected dynamically from identified gaps.
* Help explanations for consultation questions.
* Help explanations for report clarification questions.
* AI follow-up support inside consultation help dialogs.
* Automatic scrolling to new AI responses.
* Privacy and prototype limitation notices.

## Licence and Use

This prototype is developed for academic and educational purposes. It should not be used as an official Cyber Essentials certification tool or as a substitute for professional security consultancy.
