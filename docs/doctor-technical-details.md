# Doctor Modules: Technical Details

This document provides granular, function-level, and architectural details for the DialyLink Doctor Portal.

## 1. Dashboard (`/doctor/dashboard`)

### Frontend Architecture
- **Component**: `client/src/app/doctor/dashboard/page.tsx`
- **Key States**:
  - `stats`: Object containing key performance indicators (KPIs).
  - `alertPatients`: Array of patients who have flagged vital alerts (BP or Weight).
  - `connectionCode`: The 6-character unique string.
- **Functions**:
  - `fetchDashboardData()`: Aggregates data from multiple endpoints.
  - `handleRegenerateCode()`: Calls the backend to replace the existing connection code and updates the UI instantly.
  - `copyToClipboard()`: Utilizes `navigator.clipboard.writeText` and triggers a Snackbar notification.

### API Integration
- **Endpoints**:
  - `GET /api/doctor/connection-code`: Retrieves the doctor's current code from `doctor_profiles`.
  - `POST /api/doctor/connection-code/regenerate`: Generates a new 6-character alphanumeric string, verifies uniqueness against the database, and updates the profile.
  - `GET /api/doctor/patients`: Used here to calculate total patients and filter for `alert_flags` (e.g., IDWG > 2.0kg or abnormal BP).

---

## 2. My Patients (`/doctor/patients`)

### Frontend Architecture
- **Component**: `client/src/app/doctor/patients/page.tsx`
- **Key States**:
  - `patients`: Array of patient profile objects linked to the doctor.

### API Integration
- **Endpoint**: `GET /api/doctor/patients`
  - **Logic**: 
    1. Fetches the doctor's internal `doctor_profile_id` based on their `user_id`.
    2. Selects all `patient_profiles` where `connected_doctor_id` matches.
    3. Uses subqueries to fetch the most recent session dates, `bp_after`, and recent `weight_before`/`weight_after` to dynamically calculate weight gain.
    4. Evaluates `alert_flags` on the backend before sending the payload.

---

## 3. Patient Details (`/doctor/patients/[id]`)

### Frontend Architecture
- **Component**: `client/src/app/doctor/patients/[id]/page.tsx`
- **Key States**:
  - `patientData`: Master object containing the patient's profile, recent sessions, prescriptions, labs, and past consultations.
  - `notes`: Editable string bound to the "Doctor Notes" textarea.
- **Functions**:
  - `saveNotes()`: Triggers a `PUT` request with a debounce or manual save to update the patient's private notes.

### API Integration
- **Endpoint**: `GET /api/doctor/patients/:id`
  - **Logic**: Aggregates data across 5 different tables (`patient_profiles`, `dialysis_sessions`, `prescriptions`, `lab_results`, `appointments`) filtering by the `patient_profile_id`.
- **Endpoint**: `PUT /api/doctor/patients/:id/notes`
  - Updates the `doctor_notes` column in `patient_profiles`.
- **Endpoint**: `PATCH /api/doctor/patients/:id/labs/:labId`
  - Allows the doctor to append `doctor_notes` to a specific `lab_results` row. Also triggers an automated notification to the patient.

### Prescription Management
- **Endpoint**: `POST /api/doctor/patients/:id/prescriptions`
  - **Logic**: Uses a SQL transaction (`BEGIN` / `COMMIT`) to insert a parent row into `prescription_groups`, followed by looping and inserting multiple child rows into `prescriptions`.
- **Endpoint**: `PATCH /api/doctor/prescriptions/:groupId/deactivate`
  - Marks `is_active = false` on both the group and all associated medications, triggering a notification to the patient.

---

## 4. Bookings & Calendar (`/doctor/schedule`)

### Frontend Architecture
- **Component**: `client/src/app/doctor/schedule/page.tsx`
- **Key States**:
  - `appointments`: Array of all appointments across the month.
  - `availability`: Weekly template (e.g., Mon 9-5, Wed 10-2).
  - `overrides`: Specific dates marked as unavailable or with custom hours.

### API Integration
- **Endpoint**: `GET /api/doctor/availability` & `PUT /api/doctor/availability`
  - Manages the `doctor_availability` table (Days of the week).
- **Endpoint**: `POST /api/doctor/availability-overrides`
  - Inserts exceptions into the `doctor_date_overrides` table.
- **Endpoint**: `GET /api/doctor/appointments`
  - Fetches appointments to map onto the calendar UI.

---

## 5. Connection Requests

### Overview
Before a patient is fully connected, they may send a request via their connection code.

### API Integration
- **Endpoint**: `GET /api/doctor/connection-requests`
  - Fetches pending rows from `connection_requests`.
- **Endpoint**: `POST /api/doctor/connection-requests/:id/accept`
  - **Logic**: Updates the request status to 'accepted', then updates the `patient_profiles.connected_doctor_id` with the accepting doctor's ID. Sends a success notification to the patient.
- **Endpoint**: `POST /api/doctor/connection-requests/:id/decline`
  - Updates the request status to 'declined' and notifies the patient.

---

## 6. AI Assistant (`/doctor/assistant`)

### Frontend Architecture
- **Component**: Integrated chat-like interface or summary panel.
- **Key States**:
  - `summary`: Markdown or text string generated by the LLM.
  - `loadingAI`: Boolean flag during external API calls.

### Integration Logic
- **Endpoint**: Contextual calls to external LLM providers (e.g., Google Gemini).
- **Process**:
  1. The backend gathers the patient's recent vitals, latest lab results, and current prescriptions.
  2. A prompt is constructed injecting this raw data, asking the LLM to generate a concise clinical summary or identify trends (e.g., "Summarize the last 5 dialysis sessions").
  3. The response is streamed or returned to the frontend for display.
