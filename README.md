<div align="center">
  <img src="https://img.shields.io/badge/Splitwise-Clone-success?style=for-the-badge&logo=splitwise&logoColor=white" alt="Splitwise Logo" />
  
  # 💸 Splitwise Fullstack Application
  
  *A modern, real-time expense sharing application built with React, FastAPI, and PostgreSQL.*
  
  <p align="center">
    <a href="#-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-architecture--workflow">Architecture</a> •
    <a href="#-local-development">Local Setup</a> •
    <a href="#-aws-deployment-guide">Deployment</a>
  </p>
</div>

---

## ✨ Features

- **🔐 Secure Authentication:** JWT-based user login and registration system.
- **👥 Group Management:** Create groups, add friends, and manage collective expenses easily.
- **💵 Smart Expense Splitting:** Add expenses to groups with automatic calculation of "who owes who."
- **💬 Real-Time Chat (WebSockets):** Live chat within groups so members can discuss expenses instantly.
- **📊 Interactive Dashboard:** Visually appealing dashboard summarizing your total balances and recent activity.
- **📱 Responsive UI:** A premium, glassmorphic design built with Tailwind CSS that works beautifully on both desktop and mobile.

---

## 🛠 Tech Stack

### Frontend (Vercel)
- **Framework:** React 18 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Vanilla CSS (Glassmorphism & Micro-animations)
- **State Management:** Zustand
- **Networking:** Axios (HTTP) + native WebSockets

### Backend (AWS EC2)
- **Framework:** FastAPI (Python)
- **Database ORM:** SQLAlchemy + AsyncPG
- **Migrations:** Alembic
- **Real-Time:** FastAPI WebSockets
- **Containerization:** Docker

### Infrastructure (AWS)
- **Database:** Amazon RDS (PostgreSQL 15+)
- **Registry:** Amazon ECR (Elastic Container Registry)
- **Compute:** Amazon EC2 (Amazon Linux 2023)
- **Networking:** DuckDNS + Nginx Reverse Proxy + Let's Encrypt (Certbot SSL)

---

## 🏗 Architecture & Workflow

1. **User Action:** A user submits an expense on the React frontend.
2. **API Request:** The frontend sends a secure HTTPS request (with a JWT token) to the FastAPI backend hosted on an EC2 instance.
3. **Nginx Proxy:** Nginx intercepts the `https://` request, decrypts the SSL certificate, and forwards it to the Docker container on port `8000`.
4. **Processing & DB:** FastAPI processes the business logic and saves the expense to the AWS RDS PostgreSQL database via `asyncpg`.
5. **Real-Time Update:** The backend broadcasts the new expense to all connected group members over a secure `wss://` WebSocket connection.
6. **UI Refresh:** The frontend receives the WebSocket event and updates the dashboard balances instantly!

---

## 💻 Local Development

### 1. Clone the repository
```bash
git clone https://github.com/your-username/splitwise-clone.git
cd splitwise-clone
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Create a local .env file
echo "DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/splitwise" > .env
echo "JWT_SECRET=local-secret-key" >> .env
echo "ALLOWED_ORIGINS=http://localhost:5173" >> .env

# Run Migrations and Start Server
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create a local .env file
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
echo "VITE_WS_BASE_URL=ws://localhost:8000" >> .env

# Start the Vite dev server
npm run dev
```

---

## 🚀 AWS Deployment Guide

This project is deployed using a production-ready AWS architecture.

### Step 1: Push Backend to ECR
1. Authenticate Docker with Amazon ECR.
2. Build the Docker image for the backend: `docker build -t splitwise .`
3. Tag and push the image to your ECR repository.

### Step 2: Provision RDS Database
1. Create a `db.t4g.micro` PostgreSQL instance in **Amazon RDS**.
2. Set "Public Access" to `No` for maximum security.
3. Note the Database Endpoint and Master Password.

### Step 3: EC2 Instance Setup & Nginx
1. Launch an **Amazon Linux 2023** EC2 instance.
2. Attach an IAM Role with `AmazonEC2ContainerRegistryReadOnly` to allow EC2 to pull from ECR.
3. Configure the EC2 Security Group to allow inbound traffic on ports **80**, **443**, and **22**.
4. Configure the RDS Security Group to allow inbound PostgreSQL traffic (Port 5432) from the EC2 instance.
5. Install Docker, Nginx, and Certbot on the EC2 instance.

### Step 4: Run the Backend
Pull the image and run the database migrations:
```bash
sudo docker pull <YOUR-ECR-URL>/splitwise:latest
sudo docker run --rm --env-file .env <YOUR-ECR-URL>/splitwise:latest alembic upgrade head
```
Start the container:
```bash
sudo docker run -d --name splitwise-backend -p 8000:8000 --env-file .env <YOUR-ECR-URL>/splitwise:latest
```

### Step 5: Configure SSL (HTTPS)
1. Point a DuckDNS domain (e.g., `yourapp.duckdns.org`) to your EC2 Public IP.
2. Use Nginx as a reverse proxy to route port 80/443 traffic to your Docker container on port 8000.
3. Run Certbot to generate a free SSL certificate:
```bash
sudo certbot --nginx -d yourapp.duckdns.org
```

### Step 6: Deploy Frontend to Vercel
1. Connect your GitHub repository to Vercel.
2. Set your production environment variables in the Vercel Dashboard:
   - `VITE_API_BASE_URL=https://yourapp.duckdns.org`
   - `VITE_WS_BASE_URL=wss://yourapp.duckdns.org`
3. Deploy! 🎉

---
<div align="center">
  <i>Built with ❤️ for seamless expense sharing.</i>
</div>
