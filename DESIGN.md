# System Design & Application Workflow

This document details the architectural design of the application and provides a step-by-step breakdown of how the system processes data and handles key interactions.

## Architecture Overview

The project is built as a monorepo containing two main parts:
1.  **Frontend (`client/`)**: A Next.js App Router application utilizing Tailwind CSS and Shadcn UI components for styling, Zustand for global state management, TanStack Query for data fetching/caching, and Axios for HTTP requests.
2.  **Backend (`server/`)**: A Node.js application using the Express framework. It leverages Prisma ORM to connect to a PostgreSQL database (hosted on Supabase) and provides a RESTful API.

## Data Models (Prisma)

The database consists of three main entities:
*   **User**: `id`, `email`, `password` (hashed), `name`, timestamps.
*   **Task**: `id`, `title`, `description`, `status` (PENDING, IN_PROGRESS, COMPLETED, ARCHIVED), `priority` (LOW, MEDIUM, HIGH), `dueDate`, `userId` (foreign key), timestamps.
*   **RefreshToken**: `id`, `token` (hashed), `userId` (foreign key), `expiresAt`, `isRevoked`, timestamps (used for secure token rotation).

## Core Workflows (Step-by-Step)

### 1. Authentication Flow (Dual-Token JWT)

**Login / Registration Step:**
1.  **Client:** The user enters credentials in the login/register form. Zod schemas validate the inputs locally.
2.  **Network:** The frontend sends a `POST` request (via Axios) to `/auth/login` or `/auth/register`.
3.  **Server:**
    *   The request body is validated against a Zod schema.
    *   The `authController` calls the `authService` to hash passwords (bcrypt) or verify credentials.
    *   On success, the backend generates a short-lived **Access Token** (e.g., 15 minutes) and a long-lived **Refresh Token** (e.g., 7 days).
    *   The Refresh Token is cryptographically hashed and saved in the database to allow for explicit revocation and reuse detection.
    *   The backend responds with the Access Token in the JSON payload and sets the raw Refresh Token inside a secure, `httpOnly`, `SameSite=Strict` cookie.
4.  **Client:** The frontend extracts the Access Token from the JSON response and stores it in memory (Zustand state). It also redirects the user to the Dashboard.

**Token Refresh Step:**
1.  **Trigger:** When the Access Token expires, an API request returns a `401 Unauthorized`.
2.  **Axios Interceptor:** An Axios interceptor on the frontend automatically catches the 401.
3.  **Network:** The interceptor silently sends a request to `/auth/refresh`. Since `withCredentials` is true, the browser automatically attaches the `httpOnly` Refresh Token cookie.
4.  **Server:** The backend verifies the Refresh Token against the database, issues a new Access Token and a *new* Refresh Token (Token Rotation), invalidates the old one, and sends them back.
5.  **Replay:** The frontend updates the access token in memory and replays the original failed request seamlessly.

### 2. Task Management & "Today" View

**Fetching Today's Tasks Step:**
1.  **Client:** Upon loading the Dashboard, TanStack Query triggers a `GET` to `/tasks?scope=TODAY`.
2.  **Server:** The `taskController` receives the request. The `taskService` queries Prisma for tasks where `userId` matches the authenticated user and `dueDate` is less than or equal to the end of the current day in the user's timezone.
3.  **Sorting:** The backend sorts the response dynamically: incomplete tasks are pushed to the top, followed by priority descending, then by creation date.
4.  **Client:** The frontend renders the tasks.

**Toggling Task Status Step (Optimistic UI):**
1.  **Client:** The user clicks the checkbox to mark a task as completed.
2.  **Local Cache:** TanStack Query instantly updates the local cache, crossing out the text and moving the task visually to the bottom of the list without waiting for the server (Optimistic Update).
3.  **Network:** A `PATCH` request is sent to `/tasks/:id/toggle` in the background.
4.  **Server:** Prisma updates the task `status` to `COMPLETED` (or reverts it to `PENDING`).
5.  **Client:** If the network request fails, the frontend automatically rolls back the visual change and shows an error toast.

### 3. Missed Tasks Synchronization

**Detection & Prompt Step:**
1.  **Client:** When the user logs in and loads the dashboard, the frontend calls `GET /tasks/missed`.
2.  **Server:** The backend queries for any task that has a `dueDate` strictly in the past, and a status that is *not* `COMPLETED` or `ARCHIVED`.
3.  **Client:** If the missed tasks count is greater than 0, a modal appears on the frontend, blocking interactions until the user decides what to do with these stale tasks.

**Resolution Step:**
1.  **Client:** The user chooses to either "Move to Today" or "Archive". A `POST` to `/tasks/missed/sync` is sent.
2.  **Server:**
    *   If "Move": The `taskService` executes a Prisma bulk update (`updateMany`), changing the `dueDate` of all missed tasks to the current day.
    *   If "Archive": The service executes a bulk update to change their `status` to `ARCHIVED`.
3.  **Client:** The modal closes, and TanStack Query automatically invalidates the task cache, fetching the fresh data.

### 4. Progress Reporting (Analytics)

**Generating Stats Step:**
1.  **Client:** The user navigates to the Progress page. A request to `/tasks/stats` is fired.
2.  **Server:** The `taskService` runs complex Prisma aggregation queries:
    *   Groups tasks by day over the last 7 days.
    *   Counts how many were `COMPLETED` vs. missed (`PENDING` and overdue) per day.
    *   Calculates an overall completion rate percentage.
3.  **Client:** The raw data is passed into `recharts` to render an interactive bar chart and display key metrics like the "Most Productive Day".