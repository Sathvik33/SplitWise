# Splitwise

![Architecture](https://img.shields.io/badge/Architecture-Decoupled-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-61DAFB)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20SQLAlchemy-009688)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Asyncpg-336791)
![DevOps](https://img.shields.io/badge/DevOps-Docker%20%7C%20AWS%20EC2%20%7C%20RDS-FF9900)

Welcome to **Splitwise**, an industry-grade, full-stack web application designed to seamlessly track shared expenses, manage group balances, and settle debts efficiently. 

Whether you are sharing an apartment, splitting travel costs with friends, or just keeping track of IOUs, Splitwise removes the friction of "who owes who." It computes complex debt structures into simple, easy-to-understand balances.

This repository goes beyond traditional CRUD applications by implementing a **Custom, Human-in-the-Loop CSV Data Importer** capable of parsing messy legacy financial data, detecting anomalies using pure algorithmic rules (zero ML black-boxes), and resolving conflicts dynamically.

---

## ✨ Project Overview & Core Features

Splitwise is built around a robust financial ledger system. Every expense, payment, and group membership is meticulously tracked and validated to ensure 100% data integrity.

### 👥 Group & Member Management
- **Contextual Groups:** Users can create custom groups (e.g., "Miami Trip", "Apartment 4B") to organize expenses contextually.
- **Dynamic Memberships:** Invite existing users to groups. The system tracks exactly when a user joins or leaves, ensuring they are only responsible for expenses incurred during their membership.

### 💰 Expense Tracking & Ledger Engine
- **Flexible Expense Logging:** Log new expenses, defining exactly who paid the bill and who it was split with.
- **Mathematical Integrity:** The backend strictly enforces that the sum of all split portions equals the exact total of the expense.
- **Record Payments (Settling Up):** Users can easily settle their debts. The engine processes the payments and updates the running ledger instantly, netting out balances across the entire group.

### 📊 Real-Time Financial Dashboard
- **Bird's-Eye View:** A centralized dashboard provides a comprehensive summary of your financial standing: your overall balance, the total amount you owe others, and the total amount others owe you.
- **Detailed Debt Breakdowns:** See exactly who owes you money and who you need to pay back, aggregated across all your active groups.

### 🛡️ Robust Authentication & Security System
- Secure user registration and login using industry-standard encrypted passwords (`bcrypt`).
- JWT (JSON Web Token) based authorization protecting all API endpoints.
- Isolated user sessions ensuring strict data privacy and preventing cross-user data leaks.

### 🧠 Advanced CSV Importer Engine (Legacy Data Migration)
The crown jewel of this system is the specialized data importer built for legacy financial data migration (`backend/app/services/import_engine.py`). Instead of silently failing or using unpredictable AI models, it uses a deterministic, rule-based approach.

- **Strict Rule-Based Parsing:** Reads raw CSV exports, sanitizes data types, and normalizes financial inputs.
- **Comprehensive Anomaly Detection:** Automatically flags critical issues such as:
  - Missing, unregistered, or misspelled user emails.
  - Mathematical inconsistencies (e.g., split amounts not mathematically matching the total expense).
  - Invalid date formats or negative payment amounts.
  - Missing required fields (Description, Date, Amount, Paid By, Split With).
- **Interactive Human-in-the-Loop Resolution:** Instead of discarding invalid rows, the engine suspends them and presents a clean "Anomaly Report" to the user in the UI. 
- **Dynamic User Creation:** If the CSV contains a user who doesn't exist in the database, the system allows the importer to create that user dynamically or map them to an existing account before committing.
- **ACID Compliant Transactions:** Database operations are atomic. If a batch resolution fails, the entire transaction rolls back to preserve absolute database integrity.

---

## 🏗 Architecture & Tech Stack

This project follows a modern, decoupled architecture allowing for independent horizontal scaling.

### Frontend (User Interface)
* **Framework:** React 18 with TypeScript for type safety.
* **Build Tool:** Vite for lightning-fast HMR and optimized production bundles.
* **Styling:** Tailwind CSS to deliver a premium, responsive, utility-first UI design.
* **Icons & Assets:** Lucide React for crisp, scalable iconography.
* **Data Fetching:** Axios interceptors for handling JWT tokens and API routing.
* **Hosting:** Deployed at the edge via Vercel.

### Backend (Core API)
* **Framework:** FastAPI (Python 3.11) delivering unparalleled async performance.
* **ORM:** SQLAlchemy 2.0 utilizing the modern `AsyncSession` paradigm.
* **Database Driver:** `asyncpg` for non-blocking database I/O.
* **Schema Migrations:** Alembic to track and apply iterative schema changes.
* **Security:** `passlib` (bcrypt) for hashing and `python-jose` for JWT lifecycle management.

### Cloud Infrastructure & DevOps
* **Containerization:** Docker & Docker Compose for isolated, reproducible environments.
* **Compute:** AWS EC2 (Elastic Compute Cloud) running the containerized FastAPI backend.
* **Registry:** AWS ECR (Elastic Container Registry) for private Docker image storage.
* **Database:** AWS RDS (Relational Database Service) hosting the highly available PostgreSQL instance.

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### 1. Clone the Repository
```bash
git clone https://github.com/Sathvik33/SplitWise.git
cd SplitWise
```

### 2. Configure Environment Variables
You will need to set up your `.env` file in the root directory. Create a `.env` file and populate it with your local development credentials:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=splitwise
DATABASE_URL=postgresql+asyncpg://postgres:your_secure_password@db:5432/splitwise
JWT_SECRET=your_super_secret_jwt_key
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
ALLOWED_ORIGINS=http://localhost:5173,http://localhost
```

### 3. Launch the Backend & Database (via Docker)
Ensure you have Docker Desktop installed. From the root directory, run:
```bash
docker-compose up --build
```
* Docker will pull the PostgreSQL image, build the FastAPI backend, and bridge them on a custom network.
* Alembic migrations should be run against the database to create the tables.
* The API will become accessible at `http://localhost:8000`.

### 4. Launch the Frontend
Open a new terminal, navigate to the frontend folder, and install dependencies:
```bash
cd frontend
npm install
npm run dev
```
* The application will launch at `http://localhost:5173`.

---

## ☁️ Production AWS Deployment Guide

This project is configured for a robust deployment pipeline targeting AWS.

### Step 1: Build & Authenticate
Build your production Docker image:
```bash
docker build -t assignment-backend:latest ./backend
```
Authenticate your local Docker client with your AWS ECR Registry:
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
```

### Step 2: Tag & Push Image
```bash
docker tag assignment-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/splitwise:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/splitwise:latest
```

### Step 3: EC2 Deployment & RDS Connection
1. SSH into your target AWS EC2 instance.
2. Create a local `.env` file. Crucially, update the `DATABASE_URL` to point to your **AWS RDS Endpoint** and append `?ssl=require` to enforce secure transit:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@your-rds-endpoint.amazonaws.com:5432/postgres?ssl=require
   ```
3. Pull the Docker image from ECR and run it detached:
   ```bash
   sudo docker run -d \
     --name splitwise \
     --env-file .env \
     -p 8000:8000 \
     <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/splitwise:latest
   ```
4. Finally, synchronize the cloud database schema using Alembic:
   ```bash
   sudo docker exec splitwise alembic upgrade head
   ```

Your backend is now running flawlessly in the cloud!
