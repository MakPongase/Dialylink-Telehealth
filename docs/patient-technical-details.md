# Patient Modules: Technical Details

This document provides granular, function-level, and architectural details for the DialyLink Patient Portal.

## 1. Dashboard (`/patient/dashboard`)

### Frontend Architecture
- **Component**: `client/src/app/patient/dashboard/page.tsx`
- **Key States**:
  - `data`: Stores the aggregate dashboard payload.
  - `loading`: Boolean state managing the initial fetch.
- **Functions**:
  - `fetchDashboard()`: Calls `GET /api/patient/dashboard` on mount.

### API Integration
- **Endpoint**: `GET /api/patient/dashboard`
- **Data Returned**:
  - `connected_doctor`: Doctor's info, fetched via `patient_profiles.connected_doctor_id`.
  - `upcoming_appointments`: Next 3 appointments (status != 'completed' or 'cancelled').
  - `recent_dialysis_sessions`: Last 3 logged sessions.
  - `active_prescriptions_count` & `active_medications`: Validates `is_active = true` on `prescription_groups` and `prescriptions`.
  - `unread_notifications_count` & `recent_notifications`: Queries Supabase directly using `SUPABASE_SERVICE_ROLE_KEY` to bypass strict RLS for aggregation.

---

## 2. Find a Doctor (`/patient/find-doctor`)

### Frontend Architecture
- **Component**: `client/src/app/patient/find-doctor/page.tsx`
- **Key States**:
  - `doctors`: List of all available doctors in the platform.
  - `searchQuery` & `specializationFilter`: Strings used for frontend filtering.
  - `connectCode`: 6-character string bound to the connection modal input.

### API Integration
- **Endpoint**: `GET /api/patient/doctors`
  - Fetches all users with role 'doctor' along with their `doctor_profiles` data.
- **Endpoint**: `POST /api/patient/connect`
  - **Payload**: `{ connection_code: string }`
  - **Logic**: Matches the `connection_code` against `doctor_profiles`. If found, updates `patient_profiles.connected_doctor_id` with the doctor's ID.
- **Endpoint**: `POST /api/patient/disconnect`
  - Sets `connected_doctor_id` to `NULL`.

---

## 3. Session Monitoring (`/patient/monitoring`)

### Frontend Architecture
- **Component**: `client/src/app/patient/monitoring/page.tsx`
- **Key States**:
  - `sessions`: Array of logged `dialysis_sessions`.
  - `showLogModal`: Controls the visibility of the multi-step logging form.
  - **Form States**: Extensive states for BP, Weight, Symptoms, Dialysis Type (Hemodialysis vs Peritoneal), and dynamic fields based on type.

### API Integration
- **Endpoint**: `POST /api/patient/monitoring`
  - **Logic**:
    1. Determines `dialysis_type`.
    2. Calculates **IDWG** (Interdialytic Weight Gain) dynamically by fetching the `weight_after` from the most recent past session and subtracting it from the current `weight_before`.
    3. Inserts into `dialysis_sessions`.
    4. **Auto-Alerts**: Runs an intensive conditional matrix. If BP is dangerously high/low, IDWG > 3.5kg, or critical symptoms (Chest Pain, Bleeding) are present, it dynamically inserts an urgent row into the `notifications` table for the connected doctor. Uses a 4-hour cooldown logic to prevent notification spam unless critical.

---

## 4. Appointments (`/patient/appointments`)

### Frontend Architecture
- **Component**: `client/src/app/patient/appointments/page.tsx`
- **Key States**:
  - `activeTab`: 'upcoming' | 'past'.
  - `appointments`: Array of all appointments.
  - `rescheduleApptId`: Tracks if the user is in "reschedule" mode vs "new booking" mode.
  - `selectedDate` & `selectedTime`: Standardized Date objects.
- **Functions**:
  - Time slot generator (`generateTimeSlots`): Creates 30-minute intervals from 8:00 AM to 5:00 PM. Excludes slots that are already booked (`status != 'cancelled'`).

### API Integration
- **Endpoint**: `GET /api/patient/appointments`
  - Returns all appointments linked to the `patient_id`.
- **Endpoint**: `POST /api/patient/appointments`
  - **Payload**: `{ doctor_id, scheduled_at, type, notes }`
  - Sets initial status to `'pending'` and sends a notification to the doctor.
- **Endpoint**: `PUT /api/patient/appointments/:id`
  - Supports rescheduling. If rescheduled, status resets to `'pending'`.
- **Endpoint**: `PUT /api/patient/appointments/:id/cancel`
  - Soft-cancels the appointment (updates status to `'cancelled'`).

---

## 5. Health Records (`/patient/records`)

### Frontend Architecture
- **Component**: `client/src/app/patient/records/page.tsx`
- **Key Tabs**: `prescriptions`, `labs`, `documents` (Consultations removed).
- **Functions**:
  - `handleUploadSubmit()`: Utilizes `@supabase/supabase-js` to upload directly from the browser to the `patients` storage bucket. Automatically maps to `patients/lab-results/` or `patients/documents/` folders depending on the upload type.

### API Integration
- **Endpoints**: `GET /api/patient/prescriptions`, `/labs`, `/documents`
- **Endpoint**: `GET /api/patient/prescriptions/:groupId/pdf`
  - **Logic**: Uses `pdfkit` on the backend to dynamically generate an A5 PDF. Calculates the patient's exact age from `date_of_birth` and streams the binary PDF directly to the frontend for download.
- **Endpoint**: `POST /api/patient/labs` & `POST /api/patient/documents`
  - Saves the Supabase storage URL (`file_url`) to Postgres.
- **Endpoint**: `DELETE /api/patient/documents/:id`
  - Removes the database record. (Note: Supabase storage object deletion is handled by Postgres trigger or client-side depending on implementation).

---

## 6. Chat (`/patient/chat`)

### Frontend Architecture
- **Component**: `client/src/app/patient/chat/page.tsx`
- **State Management**:
  - `messages`: Array of chat objects.
  - `newMessage`: Controlled input string.
- **Functions**:
  - `setupRealtimeSubscription()`: Subscribes to the Supabase channel `custom-all-channel` listening for `INSERT` events on the `messages` table where `sender_id` or `receiver_id` matches the user.

### API Integration
- **Endpoint**: `GET /api/chat/history/:partnerId`
  - Fetches the last 50 messages between the patient and doctor.
- **Endpoint**: `POST /api/chat/send`
  - Inserts a new row into `messages`. Supabase real-time handles the broadcast.
