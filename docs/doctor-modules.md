# Doctor Modules Overview

The Doctor portal in Dialylink is designed to give medical professionals full oversight of their patients' dialysis progress, schedules, and communications. Below is a breakdown of the core modules and their respective functionalities.

## 1. Dashboard (`/doctor/dashboard`)
The central hub for the doctor, providing an at-a-glance view of critical daily metrics and urgent alerts.

**Key Functionalities:**
- **KPI Summary**: Quick metrics showing total connected patients, patients with active alerts, today's appointments, and unread messages.
- **Alert Triage System**: Prioritizes and displays patients who have flagged vital anomalies (e.g., Blood Pressure out of bounds, excessive interdialytic weight gain).
- **Connection Code Management**: Displays a unique 6-character code used by patients to securely connect to the doctor's profile. Includes the ability to copy the code to the clipboard (via Snackbar) and instantly regenerate a new code to prevent unauthorized connections.

## 2. My Patients (`/doctor/patients`)
A comprehensive directory of all patients currently connected to the doctor's profile.

**Key Functionalities:**
- **Patient Roster**: List view displaying basic patient information, recent session dates, and alert statuses.
- **Quick Handoff**: Provides direct links to dive deep into a specific patient's detailed records.

## 3. Patient Details (`/doctor/patients/[id]`)
A granular, detailed view dedicated to a single patient's medical history and treatment progress.

**Key Functionalities:**
- **Medical Summary Card**: Displays the patient's age, blood type, contact information, and current active status.
- **Categorized Tabs**:
  - **Recent Sessions**: Historical table of past dialysis sessions, including vitals (BP, Weight) and symptoms.
  - **Lab Results**: Directory of uploaded lab documents and blood work.
  - **Prescriptions**: List of active and past medications prescribed to the patient.
  - **Doctor Notes**: A private, editable text area for the doctor to maintain ongoing clinical notes regarding the patient.
- **Schedule Consultation**: A form-based modal allowing the doctor to quickly book a new consultation or dialysis session with the patient.
- **Send Message**: Instant navigation to the Chat module, automatically pre-selecting the patient to begin messaging.

## 4. Bookings & Calendar (`/doctor/schedule`)
A visual scheduling tool for managing the doctor's upcoming appointments and consultations.

**Key Functionalities:**
- **Interactive Monthly Grid**: A custom-built calendar UI mapping out all appointments across the month.
- **Appointment Blocks**: Displays patient names and times for each scheduled session directly on the calendar days.
- **Status Management**: 
  - Hover actions on pending appointments allow the doctor to quickly **Confirm** or **Cancel** them.
  - Confirmed appointments can be marked as **Completed**.
- **Pending Notifications**: A pulsing alert banner notifies the doctor if there are any appointments awaiting their approval.

## 5. Chats (`/doctor/chat`)
A secure, real-time messaging interface for direct doctor-patient communication.

**Key Functionalities:**
- **Real-Time Synchronization**: Powered by Supabase real-time channels, allowing instant two-way messaging without page refreshes.
- **Contact Selection**: A sidebar listing all connected patients, prioritizing those with unread messages (indicated by a badge).
- **Auto-Scroll & Status Indicators**: Automatically scrolls to the latest message and provides online status indicators.
## 6. AI Assistant (`/doctor/assistant` / Tab in Details)
An intelligent, integrated tool designed to assist doctors with clinical insights and summarization.

**Key Functionalities:**
- **Automated Summarization**: Can synthesize recent session vitals, lab results, and patient history into concise clinical summaries.
- **Predictive Insights**: Flags potential downward trends (e.g., slowly creeping interdialytic weight gain over 3 months) that might be missed in day-to-day monitoring.
- **Query Interface**: A chat-like interface where the doctor can ask questions about the patient's data or general treatment protocols, contextualized with the patient's current records.
