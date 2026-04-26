# Product Requirements Document: Hello Design

## 1. Executive Summary
**Hello Design** is an AI-powered system design preparation platform designed to help software engineers master complex architectural challenges. The platform provides a high-fidelity, integrated environment for diagramming, technical writing, and interactive AI-led architectural interviews.

## 2. Target Audience
- Senior Software Engineers and Architects preparing for technical interviews.
- Engineering leads looking to sharpen their system design skills.
- Students of distributed systems looking for hands-on practice.

## 3. Key User Flows
1. **Discovery:** Browse and select problems from a categorized library based on difficulty (Easy/Medium/Hard) or topic (Databases, Networking, Scalability).
2. **Practice:** Solve problems in a multi-pane workspace combining an Excalidraw-style canvas and a Lexical-style rich text editor.
3. **Interactive Interview:** Engage with an AI agent that probes the design with follow-up questions, simulating a real-world architectural review, with a real-time evaluation trace.
4. **Community Engagement:** Share solutions, browse community designs, and engage in technical discussions on architectural threads.
5. **Configuration:** Manage API keys for LLM providers (OpenAI, Anthropic) either as a guest (local storage) or as an authenticated user (cloud sync).

## 4. Functional Requirements

### 4.1 Unified Navigation
- **Global Top Navigation Bar:** Persistent across all screens, providing access to Explore, Community, Solutions, Pricing, Settings, and Auth (Login/Register).

### 4.2 Workspace & Interview
- **Practice Workspace:** Three-pane layout (Requirements, Diagramming Canvas, Rich Text Editor).
- **AI Interviewer:** Conversational agent with an "Evaluation Stream" showing real-time architectural logs and risk detection.
- **Final Evaluation:** Comprehensive scorecard grading Scalability, Reliability, Performance, and Maintainability, with AI-driven refactor proposals.

### 4.3 Settings & Data Management
- **Guest Mode:** Allows users to input and use their own API keys stored securely in `localStorage`.
- **Authenticated Mode:** Syncs settings, API configurations, and progress across devices.
- **Data Privacy:** Clear controls for clearing local storage and managing account data.

## 5. Technical Stack (UI/UX)
- **Framework:** DaisyUI / Tailwind CSS for component architecture.
- **Rich Text:** Lexical Editor integration.
- **Diagramming:** Excalidraw-style "hand-drawn" technical canvas.
- **Design System:** "Technical Precision" — Dark mode, high-contrast navy foundations with Electric Indigo accents.

## 6. Success Metrics
- Average session duration in the Practice Workspace.
- Growth of the community solution library.
- User retention for those using cloud-sync features.
