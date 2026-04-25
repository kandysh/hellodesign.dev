# ArchMaster (SysDesign Pro) — Agent Instructions

## Project Overview

This project is **ArchMaster**, an AI-powered system design preparation platform designed to help software engineers master complex architectural challenges. Unlike traditional platforms that focus on coding, ArchMaster provides a high-fidelity environment for diagramming, technical writing, and interactive AI-led architectural interviews.

---

## Target Audience

- Senior Software Engineers and Architects preparing for technical interviews.
- Engineering leads looking to sharpen their system design skills.
- Students of distributed systems looking for hands-on practice.

---

## Key User Flows

1. **Discovery**: Browse and select problems from a categorized library based on difficulty (Easy/Medium/Hard) or topic (Databases, Networking, Scalability).
2. **Practice**: Solve problems in a multi-pane workspace combining an Excalidraw-style canvas and a Lexical-style rich text editor.
3. **Interactive Interview**: Engage with an AI agent that probes the design with follow-up questions, simulating a real-world architectural review.
4. **Analysis**: Review real-time evaluation logs and final performance scores across critical dimensions like Scalability and Reliability.

---

## Functional Requirements

### 4.1 Problem Library & Dashboard
- Track progress across multiple problems.
- Visualize completion statistics and mastery levels by category.
- Filter and search for specific architectural patterns.

### 4.2 Practice Workspace
- **Diagramming Canvas**: A hand-drawn, Excalidraw-inspired tool for creating system architectures.
- **Rich Text Editor**: A Lexical-based editor for documenting data models, API designs, and trade-off analyses.
- **Requirements Pane**: Clear breakdown of functional and non-functional requirements for each problem.

### 4.3 AI Interviewer & Evaluation
- **AI Agent Chat**: A conversational interface where the AI acts as a senior architect.
- **Evaluation Stream**: Real-time logging of architectural decisions, risk detection (e.g., "Single Point of Failure"), and structural analysis.
- **Live Feedback**: Instant analysis as the user modifies their diagram or text.

### 4.4 Results & Scoring
- **Categorized Scoring**: Grades out of 100 for Scalability, Reliability, Performance, and Maintainability.
- **AI Insights**: Specific, actionable recommendations for improving the proposed design.
- **Code Snippets**: Recommended implementations for specific architectural patterns (e.g., exponential backoff).

---

## Technical Stack (UI/UX)

- **Framework**: DaisyUI / Tailwind CSS for a modern, clean component architecture.
- **Rich Text**: Lexical Editor for robust document management.
- **Diagramming**: Excalidraw-style canvas for technical sketching.
- **Theme**: "Technical Precision" — a dark-mode, high-contrast theme with electric indigo or teal accents.

---

## Success Metrics

- Average time spent per problem session.
- Improvement in user evaluation scores over time.
- Percentage of problems completed in the library.
