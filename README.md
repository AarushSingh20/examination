# examination — Examination Management Portal

A modern, responsive college-project examination portal with **Flask REST API + React/Vite + PostgreSQL**, role-based JWT authentication, course enrollment, examiner availability, exam scheduling, slot booking, online MCQ assessment, automatic grading, and dashboards for administrators, examiners, and students.

## Requirements

- Python 3.10+ (3.13 also supported)
- Node.js 20+ and npm
- PostgreSQL 14+

## 1. Create PostgreSQL database

Option A: run `docker compose up -d` at the project root to start PostgreSQL 16 automatically (the example database/password are for local development only).

Option B: open `psql` or pgAdmin Query Tool (connected to the `postgres` database) and run:

```sql
CREATE DATABASE examination;
```

## 2. Backend (Windows PowerShell)

```powershell
cd examination\backend
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env`: set your local PostgreSQL user/password in `DATABASE_URL`, set a long random `JWT_SECRET_KEY`, and change `ADMIN_PASSWORD`. Password special characters in the **database URL** must be URL-encoded.

Then create tables, seed the initial accounts and sample course/exam, and launch:

```powershell
python seed.py
python run.py
```

Backend: http://localhost:5000/api/health

If your PowerShell policy blocks venv activation, use `venv\Scripts\python.exe` directly to run commands.

macOS/Linux alternative: `python3 -m venv venv`, `source venv/bin/activate`, `cp .env.example .env`.

## 3. Frontend (new terminal)

```powershell
cd examination\frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

The Vite dev server proxies `/api` calls to the Flask backend at port 5000. To deploy, configure your reverse proxy, HTTPS, frontend domain, CORS origin, and production database settings.

## Demo accounts

- **Admin**: `admin@examination.local` / value of `ADMIN_PASSWORD` (default example: `ChangeMe123!`)
- **Examiner**: `examiner@examination.local` / same bootstrap password
- **Student**: Use **Create an account** on the login screen.

**Important**: Bootstrap passwords are development-only. Change both demo credentials before any real deployment. The seed creates or skips existing accounts rather than resetting passwords.

## Suggested first-run walkthrough

1. Sign in as Admin. The seeded course `CS101`, published MCQ exam, and examiner are already visible.
2. Create more courses and examiner accounts under **Courses** and **People**.
3. Create an exam as Admin under **Exams** (it starts as a draft).
4. Sign in as its assigned examiner, add MCQs under **Questions**, and optionally set **Availability**.
5. Admin publishes the exam after at least one question has been added, then creates a future **Slot** that fits the examiner's availability.
6. Register a student, enroll in the exam's course, then book an available slot.
7. When the slot start time arrives, open **Bookings → Attempt exam**, answer MCQs and submit. Results are instantly shown under **Results**.

All persisted date/times are UTC. The UI converts local datetime inputs to UTC before sending and displays UTC dates in the user's local timezone.

## API reference

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create student |
| POST | `/api/auth/login` | Public | JWT login |
| GET | `/api/auth/me` | Authenticated | Current user |
| GET | `/api/dashboard` | All | Role-specific dashboard |
| GET | `/api/users` | Admin | List users |
| POST | `/api/users/examiners` | Admin | Create examiner |
| GET | `/api/courses` | All | List courses |
| POST/PUT/DELETE | `/api/courses[/<id>]` | Admin | Manage courses |
| POST | `/api/enrollments` | Admin / Student | Enroll in course |
| GET | `/api/enrollments/me` | Student | My courses |
| GET | `/api/exams` | All | Role-filtered exams |
| POST | `/api/exams` | Admin | Create draft exam |
| PATCH | `/api/exams/<id>/status` | Admin | Change exam status |
| GET/POST | `/api/availability` | Admin/Examiner GET; Examiner POST | Examiner availability |
| GET/POST | `/api/slots` | All GET; Admin POST | Exam time slots |
| GET/POST | `/api/bookings` | All GET; Student POST | Reservations |
| GET/POST | `/api/exams/<id>/questions` | Role-gated | Questions / authoring |
| POST | `/api/bookings/<id>/submit` | Student | Submit timed attempt |
| GET | `/api/results` | All | Role-filtered results |

All protected endpoints require `Authorization: Bearer <JWT>`.

## Automated tests

From `backend/`, run:

```bash
pytest -q
```

The test suite uses temporary SQLite **only for isolated automated tests**; the running application is configured for PostgreSQL. The application does **not** silently fall back to SQLite if PostgreSQL is unavailable.

## Database migrations (recommended for schema evolution)

For the initial local prototype `seed.py` uses `db.create_all()` to create missing tables. For controlled schema changes use:

```bash
flask --app run:app db init
flask --app run:app db migrate -m "initial schema"
flask --app run:app db upgrade
```

Generate migrations in a development environment, review scripts, and commit the `migrations/` directory. Avoid `create_all()` as a substitute for migrations in production.

## Current scope and limits

- Fully implemented: role-based registration and login, three dashboards, courses, enrollment, exams, MCQ authoring, examiner availability, slot capacity, booking, scheduled attempts and auto-graded results.
- Slot capacity is protected by PostgreSQL row locks for concurrent bookings. Concurrent **different** slots for the same exam need an additional exam-level/unique-constraint guard if your deployment requires strict exactly-one-booking-per-exam invariants under heavy traffic.
- This version is an MVP suitable for local demonstration. Before production: HTTPS, secure cookie authentication in place of sessionStorage tokens, stricter validation, request rate limiting, audit logs, exam question randomization, accessibility testing, full migration review, and stronger attempt/availability synchronization are recommended.
- Exams unlock at their slot start. There is no remote proctoring, essay grading, payments or certificate issuance.
