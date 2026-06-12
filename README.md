# Splitwise

A full-stack Splitwise built with FastAPI (Python) and React (TypeScript).

## Tech Stack
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy 2.0 (async), Alembic, WebSockets (FastAPI), JWT Auth
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query

## Local Setup

### Backend
1. `cd backend`
2. Create and activate a virtual environment: `python -m venv venv` and `source venv/bin/activate` (or `.\venv\Scripts\activate` on Windows)
3. Install dependencies: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and configure your database connection and JWT secret
5. Run migrations: `alembic upgrade head`
6. Start dev server: `uvicorn app.main:app --reload`

### Frontend
1. `cd frontend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` if necessary (defaults point to `localhost:8000`)
4. Start dev server: `npm run dev`

## Deployment

### Backend (AWS EC2 / Railway)
- Use the included `Dockerfile`.
- Map port 8000.
- Make sure to provide `DATABASE_URL` (pointing to AWS RDS), `JWT_SECRET`, and `ALLOWED_ORIGINS` as environment variables.

### Frontend (Vercel)
- Connect repository to Vercel.
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Set Environment Variables: `VITE_API_BASE_URL` (HTTPS URL of your backend server) and `VITE_WS_BASE_URL` (WSS URL of your backend server).
