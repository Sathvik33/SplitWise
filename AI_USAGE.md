# AI Usage Documentation

## AI Tools Used
- **Antigravity (Google DeepMind)**: Utilized as an advanced agentic pair-programmer for full-stack development, debugging, and cloud deployment infrastructure.

## Key Prompts Used
To effectively collaborate with the AI, I provided highly detailed, architecture-focused prompts rather than just asking it to write basic code:

1. **Frontend UI & Logic:** *"Design a modern, responsive React dashboard using Tailwind CSS. The dashboard needs to fetch data asynchronously from the FastAPI backend and display real-time balances, grouping debts by user. Ensure the components are modular and handle loading states smoothly."*
2. **Backend CSV Import Engine:** *"Implement a custom CSV importer in FastAPI that strictly parses financial data without using Machine Learning algorithms or pandas. It must detect anomalies like missing users, mathematically incorrect split amounts, and negative payments. Expose these anomalies so the frontend can render a human-in-the-loop resolution UI."*
3. **AWS Deployment Architecture:** *"Generate a production-ready docker workflow for deploying the FastAPI backend to an AWS EC2 instance. It must securely connect to an external AWS RDS PostgreSQL database. Do not bake the database passwords into the image; use environment variable injection via `.env` instead."*

## Examples of AI Mistakes and Corrections

### 1. CSV Importer Engine - Asynchronous Transaction Errors
**What the AI did wrong:** While building the CSV import engine, the AI attempted to perform database commits (`db.commit()`) in the middle of a loop while parsing rows. This caused a `MissingGreenletException` and invalidated the object references for subsequent row creations. Additionally, the AI incorrectly mapped a CSV column to a `date` keyword argument instead of the required `created_at` field on the `Payment` SQLAlchemy model.
**How I caught it:** During local testing of the CSV upload, the FastAPI backend threw a `500 Internal Server Error`. I reviewed the Uvicorn stack trace and spotted the `MissingGreenletException` and `TypeError`.
**What I changed:** I intervened and instructed the AI to batch the inserts using `db.flush()` instead of committing mid-transaction to maintain ACID compliance. I also corrected the AI on the model schema, explicitly mapping the CSV date column to the `created_at` attribute.

### 2. Cross-Origin Resource Sharing (CORS) Configuration 
**What the AI did wrong:** When configuring the FastAPI backend for production, the AI tightly restricted the CORS middleware but failed to dynamically include the local Vite development server port (`http://localhost:5173`) in the `ALLOWED_ORIGINS` list. 
**How I caught it:** When testing the frontend login page, the browser console threw a strict CORS policy violation error, blocking the `POST /api/auth/login` preflight request.
**What I changed:** I identified the blocked origin in the browser network tab. I then directed the AI to update the `backend/.env` file and the `main.py` CORS middleware to explicitly whitelist both the Vercel production domain and the local `5173` dev port.

### 3. Production Deployment - Database Connection Refused
**What the AI did wrong:** During the AWS EC2 deployment phase, the AI baked a local `.env` file containing `localhost:5432` into the Docker image. When running on the EC2 instance, the backend attempted to connect to itself instead of the external AWS RDS instance, completely ignoring the production RDS endpoint.
**How I caught it:** I ran `docker logs splitwise` on the EC2 server and found `OSError: [Errno 111] Connection refused` errors continuously crashing the application during API requests.
**What I changed:** I deduced that the container was missing the production environment variables because `.env` was in `.dockerignore`. I manually created the `.env` file directly on the EC2 instance, injected the exact RDS host endpoint with `ssl=require`, and passed it via the `-e` flags to the `docker run` command, instantly resolving the connection issue.
