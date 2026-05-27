# DialyLink

A comprehensive telemedicine and dialysis patient monitoring system built to connect patients, nephrologists, and system administrators on a single unified platform.

---

## How the App Works

DialyLink operates on a decoupled client-server architecture, providing three distinct user portals:

### 1. Patient Portal
- **Symptom Triage (AI-Powered):** Patients can describe their symptoms, and the Gemini AI engine recommends the appropriate medical specialist before they book an appointment.
- **Health Companion Chat:** Patients can ask health-related questions. The backend injects their real-time dialysis sessions and medication history into the AI prompt to provide highly accurate, contextual answers.
- **Appointments & Records:** Patients can book consultations and view their ongoing dialysis treatment history and prescriptions.

### 2. Doctor Portal
- **Verification System:** Doctors must undergo a manual verification process by an admin before they can interact with patients or accept appointments.
- **Clinical Advisor (AI-Powered):** Doctors can view a patient's profile and use the AI Clinical Advisor to get rapid summaries of the patient's recent labs, sessions, and active alerts (e.g., blood pressure spikes).
- **Patient Management:** Nephrologists and other specialists can prescribe medications, log new dialysis sessions, and manage their appointment queue.

### 3. Admin Portal
- **Dashboard & Approvals:** Built as a seamless single-page application (SPA), the admin dashboard allows system operators to review and approve/reject pending doctor registrations.
- **User Management:** Admins can view the entire directory of registered patients and doctors, with the ultimate authority to suspend malicious or inactive accounts.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Hosted on Neon)
- **Infrastructure:** Supabase (Auth, Storage, Realtime)
- **AI Engine:** Google Gemini 2.5 Flash

---

## Test Accounts / Credentials

If you are testing the platform locally or reviewing the deployment, you can use the following seeded accounts. 

**Default Password for all seeded accounts:** `password123`

### Patients
- `patient@dialylink.com`
- `sarah.j@example.com`
- `mike.t@example.com`

### Doctors (Verified)
- `doc.simbalo@gmail.com` (Nephrology)
- `bob.reyes@clinic.com` (Internal Medicine)
- `charlie.cruz@clinic.com` (General Practice)

### Admin
- `admin@dialylink.com` (AdminPassword123)

---

## Additional Notes

- **AI Architecture (Dynamic Data Injection):** Unlike traditional RAG (Retrieval-Augmented Generation) setups that rely on vector databases, DialyLink guarantees 100% data accuracy by querying the PostgreSQL database for the patient's exact medical history and injecting it directly into the Gemini prompt. This eliminates hallucination risks and is crucial for healthcare compliance.
- **Deployment Strategy:** The Next.js frontend is designed for Vercel, while the Express API backend is optimized for platforms like Render or Heroku. The databases are cloud-native via Neon and Supabase.
- **Current Limitations (MVP Scope):** For the purpose of this initial MVP launch, an external Email API service (like SendGrid or Resend) has not been integrated. As a result, email-based notifications (e.g., registration confirmations) and the "Forgot Password" functionality are currently non-functional and serve as UI placeholders for future development.
