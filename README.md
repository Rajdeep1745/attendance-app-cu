# Smart Attendance

Smart Attendance is a full-stack attendance management app for classroom batches. It includes a React frontend, an Express API, and a Supabase Postgres database.

The app currently supports authentication, profile management, teacher batch management, student enrollment, attendance dashboards, reports, and curriculum planning. Teacher pages are connected to the backend. Student-facing pages are routed and functional in the frontend, but in this workspace they still read from local student data files instead of backend APIs.

## Features

- Implemented teacher and student signup/login
- JWT-protected backend routes
- Role-based teacher API access
- Implemented profile read/update for teachers and students
- Teacher batch creation, rename, deletion, and attendance-threshold updates
- Student enrollment into teacher-owned batches
- Student removal from a batch or full student deletion
- Batch attendance statistics and graph data
- Daily attendance lookup by date
- Frequent absentee reports
- Lecture curriculum management by unit/topic
- Weekly teaching plan creation and persistence
- Face registration UI and database table placeholders for future recognition work
- Global alert/toast UI

## Current Status

Implemented backend-backed flows:

- Authentication through `/api/auth/signup` and `/api/auth/login`
- Profile fetch/update through `/api/users/me`
- Teacher batch, student, attendance report, and lecture APIs
- Supabase schema bootstrap through `db:init`

Frontend-only or planned flows:

- Student pages exist and render, but still read from `src/app/student/mockStudentData.js` and `src/app/student/studentDataService.js`
- Face registration and automatic attendance recognition are UI/schema placeholders
- Manual attendance creation/update endpoints are not currently exposed
- Production backend URL in `.env.production` is a placeholder

## Tech Stack

Frontend:

- React 19
- React Router 7
- React Context API
- react-day-picker
- Bootstrap / Font Awesome classes in the UI
- Create React App scripts

Backend:

- Node.js
- Express 5
- Supabase JS client
- PostgreSQL via `pg` for schema initialization
- JWT authentication
- bcryptjs password hashing
- dotenv, cors, multer

Database:

- Supabase Postgres
- SQL bootstrap script at `attendance-app-cu backend/db/schema.sql`

## Project Structure

```text
attendance-app-cu/
|- public/
|- src/
|  |- app/
|  |  |- layout/
|  |  |- login/
|  |  |- profile/
|  |  |- student/
|  |  |- teacher/
|  |- components/
|  |- context/
|- attendance-app-cu backend/
|  |- config/
|  |- controllers/
|  |- db/
|  |- middleware/
|  |- routes/
|  |- scripts/
|- sample.sql
|- ATTENDANCE_APP_GUIDE.md
|- package.json
|- README.md
```

Important files:

- `src/App.js` defines the frontend routes
- `src/app/layout/Layout.js` renders the shared authenticated layout
- `src/app/layout/sidebar/TeacherSidebar.js` loads and manages teacher batches
- `src/app/teacher/*` contains the teacher pages
- `src/app/student/*` contains the student pages and local student demo data
- `attendance-app-cu backend/server.js` mounts the API routes
- `attendance-app-cu backend/controllers/*` contains backend business logic
- `attendance-app-cu backend/db/schema.sql` contains the Supabase schema

## Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project
- A Supabase service role key
- A direct Supabase Postgres connection string for first-time schema setup

## Environment Variables

Create or update the root frontend `.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:5000/
```

Create `attendance-app-cu backend/.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=your_supabase_postgres_connection_string
JWT_SECRET=replace_this_with_a_strong_secret
```

Notes:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are used by `config/supabaseClient.js`.
- `SUPABASE_DB_URL` is used by `scripts/initDb.js` to create database tables and functions.
- `JWT_SECRET` signs login tokens. The backend has a fallback value, but you should set a real secret locally and in production.
- `.env.production` currently points to `https://api.production.com/`; replace it before deploying.

## Installation

Install frontend dependencies from the repository root:

```bash
npm install
```

Install backend dependencies:

```bash
npm --prefix "./attendance-app-cu backend" install
```

## Database Setup

Run the bootstrap script once after adding the backend environment variables:

```bash
npm --prefix "./attendance-app-cu backend" run db:init
```

The script creates the required tables, indexes, and helper functions if they do not already exist. It is designed to be safe to re-run for normal setup.

Tables include:

- `users`
- `batches`
- `students`
- `enrollments`
- `batch_attendances`
- `student_attendances`
- `lecture_curriculum`
- `lecture_curriculum_topics`
- `lecture_schedule`
- `student_face_data`

Helper functions include:

- `increment_student_count`
- `decrement_student_count`
- `frequent_absentees`

## Running the App

Start the frontend only:

```bash
npm start
```

The frontend runs at:

```text
http://localhost:3000
```

Start the backend only:

```bash
npm run backend
```

The backend runs at:

```text
http://localhost:5000
```

Start both together:

```bash
npm run both
```

## Available Scripts

Root scripts:

- `npm start` starts the React development server
- `npm run backend` starts the backend with nodemon
- `npm run both` starts frontend and backend together
- `npm run build` creates a production frontend build
- `npm test` runs frontend tests

Backend scripts:

- `npm --prefix "./attendance-app-cu backend" run start` starts `server.js`
- `npm --prefix "./attendance-app-cu backend" run dev` starts the backend with nodemon
- `npm --prefix "./attendance-app-cu backend" run db:init` initializes the Supabase schema

## Frontend Routes

Public routes:

- `/login`
- `/signup`

Authenticated routes:

- `/:userId`
- `/:userId/:batchId/dashboard`
- `/:userId/:batchId/attendance`
- `/:userId/:batchId/students`
- `/:userId/:batchId/reports`
- `/:userId/:batchId/lectures`
- `/profile`

The authenticated batch pages render teacher or student screens based on the saved `user.role` value from login.

## API Overview

All protected routes expect:

```text
Authorization: Bearer <token>
```

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`

Users:

- `GET /api/users/me`
- `PATCH /api/users/me`

Batches:

- `GET /api/batches`
- `GET /api/batches/:id`
- `POST /api/batches`
- `PATCH /api/batches/:id`
- `DELETE /api/batches/:id`
- `PATCH /api/batches/:id/threshold`

Students:

- `GET /api/students/:batchId`
- `POST /api/students`
- `DELETE /api/students/:id/:batchId`
- `DELETE /api/students/:id`

Attendance:

- `GET /api/attendance/:id/stats`
- `GET /api/attendance/:id/graph`
- `GET /api/attendance/:batchId/daily?date=YYYY-MM-DD`
- `GET /api/attendance/:id/frequent-absentees`

Lectures:

- `GET /api/lectures/curriculum/:batchId`
- `POST /api/lectures/curriculum/:batchId`
- `GET /api/lectures/plan/:batchId`
- `POST /api/lectures/plan/:batchId`

## Typical Teacher Flow

1. Sign up or log in as a teacher.
2. Create a batch from the teacher sidebar.
3. Add students to the selected batch.
4. View batch dashboard statistics and attendance reports.
5. Configure attendance threshold from the dashboard.
6. Add curriculum units/topics.
7. Save a weekly teaching plan.

## Development Notes

- The backend listens on port `5000`.
- The frontend uses `REACT_APP_BACKEND_URL` and appends paths like `api/batches`.
- Teacher APIs enforce ownership checks before reading or mutating batch data.
- The schema stores password hashes in the `users` table for app-managed authentication.
- `ATTENDANCE_APP_GUIDE.md` contains a longer project guide.
- `sample.sql` appears to be an additional SQL reference file; the active bootstrap path is `attendance-app-cu backend/db/schema.sql`.

## Missing Work

The following items are still absent from the current source:

- Student pages are present, but they still use local mock data from `src/app/student/mockStudentData.js` and `src/app/student/studentDataService.js`.
- Endpoints for marking or editing daily attendance are not exposed in `attendanceRoutes.js`.
- Face registration upload is not wired to backend storage or `student_face_data`.
- The face/image recognition attendance pipeline is not implemented.
- App-owned frontend/backend tests are not present.
- `.env.production` still uses the placeholder backend URL `https://api.production.com/`.

## Suggested Next Improvements

- Replace the student mock data service with backend-backed student endpoints.
- Add APIs and UI actions for marking or editing daily attendance.
- Wire face registration uploads to backend storage and `student_face_data`.
- Implement the face/image recognition attendance pipeline.
- Add backend tests for controllers and middleware.
- Add frontend tests for login, batch management, profile, and page data loading.
- Replace production placeholder URLs and document deployment steps.

## License

The backend package currently declares `ISC`, but this repository does not include a dedicated license file. Add one before publishing or distributing the project.
