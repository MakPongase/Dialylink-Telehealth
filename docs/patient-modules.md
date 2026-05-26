# Patient Modules Overview

The Patient portal in Dialylink is designed to give patients a comprehensive tool to manage their dialysis treatments, communicate with their nephrologists, and securely store their medical history. Below is a breakdown of the core modules and their respective functionalities.

## 1. Dashboard (`/patient/dashboard`)
The central hub for the patient, providing a clear overview of their upcoming treatments, recent health trends, and quick access to their connected doctor.

**Key Functionalities:**
- **KPI Summary**: Quick metrics showing total sessions logged, active prescriptions, unread messages, and upcoming appointments.
- **Next Appointment Panel**: Prominently displays the next scheduled consultation or check-up, acting as a direct reminder.
- **Doctor Card**: Displays the patient's connected doctor. If no doctor is connected, it shows a prominent Call-to-Action to navigate to the "Find a Doctor" page.
- **Recent Sessions Snapshot**: A mini-table showing the most recent dialysis sessions logged by the patient.

## 2. Find a Doctor (`/patient/find-doctor`)
A discovery and connection interface allowing patients to link their profiles to verified medical professionals in the Dialylink network.

**Key Functionalities:**
- **Directory Search & Filter**: Patients can search for doctors by name, or filter the directory based on specialization (e.g., Nephrology, Cardiology).
- **Doctor Profiles**: Displays detailed information about each doctor, including their hospital affiliation and years of experience.
- **Secure Connection Modal**: To connect, patients must input a unique 6-character connection code provided by the doctor, ensuring that medical records are securely shared only with authorized personnel.

## 3. Session Monitoring (`/patient/monitoring`)
A self-tracking module for patients to log their vital signs and symptoms during or after their dialysis sessions.

**Key Functionalities:**
- **Session Logging**: A detailed form modal where patients input their Pre and Post Blood Pressure, Pre and Post Weight, and select multiple symptoms (e.g., Nausea, Cramps, Fatigue).
- **Trend Visualization (Recharts)**: An interactive line chart that plots Blood Pressure (Systolic and Diastolic) trends over time, helping patients visualize their stability across sessions.
- **Session History Log**: A comprehensive chronological list of all logged sessions, including symptom tags and calculated weight changes.

## 4. Appointments (`/patient/appointments`)
A dedicated scheduling interface for patients to manage their consultations and check-ups with their connected doctor.

**Key Functionalities:**
- **Categorized Tabs**: Clearly separates `Upcoming` and `Past` appointments to prevent clutter.
- **Book Appointment**: A modal allowing patients to request specific dates, times, and types (Consultation vs. Routine Check) along with a custom note/reason for the visit.
- **Status Badges**: Visually indicates if an appointment request is `Pending` (awaiting doctor approval), `Confirmed`, `Completed`, or `Cancelled`.
- **Empty States & Warnings**: If the patient is not connected to a doctor, a warning banner prevents booking and redirects them to the discovery page.

## 5. Health Records (`/patient/records`)
A secure, multi-tabbed document management system for maintaining the patient's complete clinical history.

**Key Functionalities:**
- **Prescriptions**: 
  - Displays currently active medications with precise dosages and doctor's instructions.
  - Automatically collapses discontinued medications under "Past Prescriptions".
  - **PDF Generation**: Patients can dynamically generate and download a formally styled A5 PDF of their active prescriptions, complete with the doctor's details.
- **Lab Results**:
  - Securely upload blood work or scans (PDF, JPG, PNG) directly to Supabase storage.
  - Displays doctor's feedback notes clearly if the doctor has reviewed the lab result.
  - Features a custom dark-mode lightbox for previewing images without leaving the page.
- **Documents**: A general repository for referral letters and clinical summaries, featuring strict file size validations and an explicit "Delete Confirmation" flow to prevent accidental data loss.
- **Consultations**: A read-only view of past, completed appointments detailing the doctor's clinical consultation summaries.

## 6. Chat (`/patient/chat`)
A secure, real-time messaging interface for direct patient-doctor communication.

**Key Functionalities:**
- **Real-Time Synchronization**: Powered by Supabase real-time channels (`postgres_changes`), enabling instant two-way messaging with their connected doctor without page refreshes.
- **Exclusive Routing**: The interface is locked exclusively to their connected doctor. If no doctor is linked, the chat is disabled with a prompt to connect.
- **Auto-Scroll & Timestamps**: Automatically scrolls to the latest message, cleanly segments conversations by 5-minute intervals, and visually distinguishes sent vs. received messages.
- **HIPAA Compliant Notice**: Assures the patient that messages are securely transmitted and handled.
