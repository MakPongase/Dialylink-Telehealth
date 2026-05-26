# DialyLink AI Integration Architecture

This document outlines how the AI features in DialyLink are built, specifically the **Patient Health Companion**, the **Patient Symptom Triage**, and the **Doctor Clinical Advisor**. 

This documentation can be shared with other AI assistants (like Claude) to understand the technical implementation, prompting strategy, and data injection architecture.

## 1. Core AI Engine
DialyLink uses **Google Gemini 2.5 Flash** as its underlying LLM.
- **Model:** `gemini-2.5-flash`
- **Integration Method:** Direct HTTP `fetch` to `generativelanguage.googleapis.com` via the Express.js backend.
- **Why Flash?** It provides near-instant response times for conversational triage and fast clinical reasoning, which is critical for real-time chat UX.

---

## 2. Patient Module: Symptom Triage (`/api/patient/ai/symptom-triage`)

**Purpose:** To guide a patient to the correct specialist based on their described symptoms.

**Implementation Details:**
- **Trigger:** When a patient searches for a doctor and clicks "Help me find a doctor" or describes their symptoms.
- **Input:** A string `symptoms_description`.
- **System Instruction:**
  ```text
  You are a medical triage assistant helping a patient find the right type of doctor. Based on their described symptoms, respond with:
  1. A brief plain-language explanation of what their symptoms might relate to (general, not a diagnosis).
  2. The most relevant medical specialization(s) they should consult (from this list only: Nephrology, Internal Medicine, Cardiology, General Practice, Pulmonology, Endocrinology).
  3. A short reason why.

  Respond with ONLY valid JSON in this exact shape (no markdown, no code blocks):
  {"explanation": string, "recommended_specializations": string[], "reason": string}

  Never diagnose. Never recommend specific medications. Keep it under 150 words total.
  ```
- **Output:** The backend sanitizes the markdown fences and parses the JSON. The frontend uses the `recommended_specializations` array to auto-filter the doctor directory.
- **Settings:** `maxTokens: 600`, `temperature: 0.2` (Low temperature for strict JSON output).

---

## 3. Patient Module: Health Companion Chat (`/api/patient/ai/health-chat`)

**Purpose:** A conversational AI assistant that can answer general health questions while possessing context about the patient's specific dialysis history.

**Implementation Details:**
- **Trigger:** When the patient opens the "AI Companion" chat interface.
- **Data Injection (RAG Alternative):** Instead of using a complex vector database, the backend intercepts the chat request, queries PostgreSQL (Neon), and injects real-time patient data directly into the System Prompt.
  - Queries: Last 5 dialysis sessions (BP, weight, symptoms), active medications (prescriptions), last 3 lab results, and the connected doctor's name.
- **System Instruction:**
  ```text
  You are a personal health companion for a dialysis patient. You have access to their recent health data below. Answer their questions in simple, friendly, non-technical language. Never diagnose or prescribe. Never suggest stopping medications. Always recommend they consult their doctor for medical decisions. Keep answers under 150 words.
  
  Their doctor is: Dr. [Doctor Name]
  
  RECENT DIALYSIS SESSIONS (last 5):
  [Formatted Session Data]
  
  ACTIVE MEDICATIONS:
  [Formatted Medication Data]
  
  RECENT LAB RESULTS:
  [Formatted Lab Data]
  ```
- **Settings:** `maxTokens: 400`, `temperature: 0.4` (Medium temperature for friendly, conversational tone).

---

## 4. Doctor Module: Clinical Advisor (`/api/doctor/patients/:id/ai/clinical-advisor`)

**Purpose:** An AI tool built into the patient record view that helps doctors quickly summarize complex patient histories or analyze recent trends (e.g., blood pressure spikes over the last week).

**Implementation Details:**
- **Trigger:** When a doctor is viewing a specific patient's profile and opens the "Clinical Advisor" tab.
- **Data Injection:** The backend queries the patient's entire recent profile and injects it into the prompt.
  - Queries: Demographics (Age, Blood Type), Last 5 dialysis sessions, Active Medications, Recent Lab Results, and **Active Alerts** (e.g., BP > 180).
- **System Instruction:**
  ```text
  You are a clinical assistant helping a licensed nephrologist review their dialysis patient. Answer clearly and concisely based only on the data provided. Always remind the doctor to apply their own clinical judgment. Never make a diagnosis. If data is insufficient, say so. Format responses with bullet points where helpful. Keep answers under 200 words unless a summary is explicitly requested.

  PATIENT DATA:
  Name: [Name]
  Date of Birth: [DOB] (Age: [Age])
  Blood Type: [Blood Type]

  RECENT DIALYSIS SESSIONS (last 5):
  [Formatted Sessions]

  ACTIVE MEDICATIONS:
  [Formatted Medications]

  RECENT LAB RESULTS:
  [Formatted Labs]

  ACTIVE ALERTS: [e.g., High BP alert on May 25]
  ```
- **Settings:** `maxTokens: 512`, `temperature: 0.3` (Low temperature for highly analytical, factual, and strictly data-driven responses).

---

## Technical Notes for Future Claude Development

If you are expanding these features or refactoring the AI module, please note:
1. **No External RAG:** We do not use LangChain or Vector Databases. The context window of Gemini 2.5 Flash is large enough (1M+ tokens) that we can dynamically inject SQL query results as raw text directly into the system prompt. This guarantees the AI always has the 100% most up-to-date patient data with zero latency.
2. **State Management:** The chat history (the `messages` array) is currently maintained in the frontend React state. If the user refreshes, the chat history clears.
3. **Future Extension:** If you need to add memory, create a `chat_history` table in Postgres and store the `role` and `parts.text`.
