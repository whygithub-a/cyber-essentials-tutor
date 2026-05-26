# Cyber Essentials Intelligent Tutoring System

## Project Overview

This repository contains the software prototype for an MSc dissertation project. The project is an AI-based Intelligent Tutoring System designed to support Cyber Essentials training for small enterprise IT teams and non-specialist administrators.

The system allows users to study Cyber Essentials topics, ask contextual questions, complete scenario-based assessments, and receive formative feedback.

This prototype is an educational tool. It is not an official Cyber Essentials certification platform and does not provide certification decisions, legal compliance advice, or professional security consultancy.

## Project Aim

The aim of this project is to design, implement, and evaluate an AI-driven Intelligent Tutoring System that provides accessible and engaging cybersecurity compliance guidance based on the Cyber Essentials framework.

## Main Features

- Structured Cyber Essentials learning topics
- RAG-based AI tutor for source-grounded explanations
- Scenario-based open-ended assessment
- Rubric-guided formative feedback
- Lightweight progress visualisation
- Privacy-preserving evaluation mode

## Technology Stack

### Frontend

- React
- TypeScript
- Bootstrap or React-Bootstrap

### Backend

- Python
- FastAPI
- Azure OpenAI API

### AI Components

- Azure OpenAI chat model for tutoring and feedback
- Azure OpenAI embedding model for retrieval
- Retrieval-Augmented Generation based on Cyber Essentials document chunks

## Project Structure

```text
cyber-essentials-tutor/
├── frontend/
│   └── React frontend application
├── backend/
│   └── FastAPI backend application
├── docs/
│   └── architecture and design notes
├── .gitignore
├── .env.example
└── README.md
