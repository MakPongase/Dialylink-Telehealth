# Notifications & Real-Time Architecture (Supabase Realtime)

## 1. Current State of Notifications
Currently, DialyLink utilizes a standard HTTP polling / REST-based notification system. 
- **Database:** Notifications are stored in a dedicated `notifications` table (or similar table mapping `user_id` to `message`, `type`, and `is_read` status).
- **Backend (`/api/notifications`):** The server has routes to fetch unread notifications, mark specific notifications as read, and mark all as read.
- **Frontend Component (`NotificationBell.tsx`):** The UI uses a bell icon that polls the API to get the unread count and fetch the dropdown list of notifications.
- **Trigger Points:** Notifications are programmatically inserted into the database during key events (e.g., when a doctor issues a prescription, when an appointment is confirmed, when lab results get feedback, or when a patient requests a connection).

### Patient Notification Events
- Appointment status updates (confirmed, completed, cancelled)
- Meeting link added to appointment
- New prescription issued by doctor
- Lab result feedback provided by doctor

### Doctor Notification Events
- New patient connection request
- Patient logged a new dialysis session
- Patient uploaded a new health record/lab result
- Patient booked a new appointment

---

## 2. The Gap: Real-Time Functionality
While the database and backend logic exist to create and fetch notifications, the frontend currently lacks **Real-Time WebSockets**. If a doctor issues a prescription, the patient won't see the notification badge update until they refresh the page or trigger a re-fetch.

Because DialyLink uses **Supabase**, we don't need to build a custom WebSocket server (like Socket.io). We can use **Supabase Realtime**, which broadcasts PostgreSQL database changes directly to the frontend clients via WebSockets.

---

## 3. How Supabase Realtime Works for DialyLink
Supabase allows you to subscribe to database changes (INSERTs, UPDATEs, DELETEs) on specific tables.
1. The `NotificationBell` component subscribes to `INSERT` events on the `notifications` table.
2. The subscription is filtered so it only listens for rows where `user_id` matches the currently logged-in user.
3. When a new row is inserted, the Supabase client receives the payload instantly.
4. The frontend state updates automatically, showing a red dot on the bell and adding the new message to the list without refreshing the page.
5. This same concept can be applied to the **Chat System** to make messaging instantaneous.

---

## 4. Prompt for Claude (Implementation Guide)

If you are continuing the development of the real-time notification and chat system, copy and paste the following prompt to Claude to get the exact code implementation:

> **PROMPT FOR CLAUDE:**
>
> "Hi Claude. I am working on the 'DialyLink' telehealth web application built with Next.js 14 (App Router) and an Express.js/PostgreSQL backend. We are using Supabase for Auth and Storage, and now I want to implement **Supabase Realtime** for our Notifications and Chat systems.
>
> **Current Setup:**
> - Our PostgreSQL database is hosted on Neon, but we use a Supabase project connected to it.
> - We have a `notifications` table with columns: `id`, `user_id`, `type`, `message`, `is_read`, `created_at`.
> - We have a Next.js client component `NotificationBell.tsx` that currently fetches notifications via our Express API (`GET /api/notifications`).
> 
> **What I need you to do:**
> 1. Provide the exact SQL command to enable logical replication / Supabase Realtime for the `notifications` table.
> 2. Show me how to update my `NotificationBell.tsx` component to subscribe to Supabase Realtime `INSERT` events on the `notifications` table, specifically filtering by the logged-in `user_id`.
> 3. Provide a reusable React Hook (e.g., `useSupabaseRealtime.ts`) that I can easily drop into both my Notification component and my Chat component.
> 4. Ensure the code handles cleanup (unsubscribing) when the component unmounts to prevent memory leaks.
> 
> Please write production-ready TypeScript code for the client components and provide step-by-step instructions for the database configuration."
