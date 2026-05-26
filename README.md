# DialyLink

A telemedicine and dialysis patient monitoring system.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Supabase
- **Backend**: Node.js, Express.js, PostgreSQL
- **Database**: PostgreSQL (via Neon)
- **Auth/Realtime/Storage**: Supabase

## Setup Instructions

### Prerequisites
- Node.js installed
- A Neon PostgreSQL database instance
- A Supabase project instance

### Environment Variables
1. Copy `.env.example` to `.env` in the root directory.
2. Fill in the values for:
   - `DATABASE_URL` (Neon Postgres URL)
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Supabase API settings)
   - `JWT_SECRET` (A strong random string for your Node.js API)
   - Frontend equivalent variables (`NEXT_PUBLIC_SUPABASE_URL`, etc.)

### Backend Setup (Server)
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. The dependencies are already installed. You can start the development server by adding a script to `server/package.json` and running it.

### Frontend Setup (Client)
1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
