# AI_USAGE.md

## Primary AI Collaborator
Antigravity (Advanced Agentic Coding AI by Google DeepMind)

## Core Collaboration Workflow
I utilized Antigravity as a full pair-programming agentic collaborator. Rather than just asking it to "write code," I operated as the Product Manager and Architect, establishing the environment constraints, database credentials, and broad feature sets, while delegating the low-level implementation, component wiring, and CSS styling to the agent.

## Key Prompts Used
1. *"Geerate a Rich Readme file from starting to ending including the deployment part and mention all the features and the workflow of our project and that has to be asthetic."*
2. *"Ya proceed with that plan and do we have to use nay ML Algorithms like Isolation Forest or Z Score Method or IQR Method to detect outliers and also Make the UI More realistic it is pretty basic now not more AIistic but humanisticc."*
3. *"ok now focus on the CSV file and export and import things we have to implement that feature"*

## Examples of AI Mistakes and Corrections

### 1. Misunderstanding Local vs Remote Database Connectivity during Migrations
**What happened:** When instructed to generate Alembic database migrations, the AI attempted to run `alembic revision --autogenerate`. However, because the AWS RDS database was isolated within a VPC, the local Windows machine threw a `socket.gaierror: [Errno 11001] getaddrinfo failed`. The AI then tried running it again with a hardcoded `db` hostname from Docker, which also failed natively on Windows.
**How I caught it:** I observed the `getaddrinfo` errors failing in the terminal execution logs.
**How it was fixed:** I recognized the networking gap and instructed the AI to update the local `.env` file to point to `localhost:5432` so that it could target the local PostgreSQL container running via docker-compose instead of attempting to reach the remote AWS RDS instance directly from my native Windows shell.

### 2. Typo in LocalStorage Token Key
**What happened:** When building the `ImportPage.tsx` React component, the AI hardcoded the API request headers to use `localStorage.getItem('token')`. However, earlier in the project, the authentication context was configured to save the JWT under the key `'splitwise_token'`. 
**How I caught it:** When I attempted to use the "Analyze File" button in the browser, the network request failed with a `401 Unauthorized` HTTP status, which I pasted back to the AI.
**How it was fixed:** The AI investigated the FastApi router, verified the CORS headers, and eventually checked the `AuthContext.tsx` file to realize its key mismatch error, immediately replacing `'token'` with `'splitwise_token'` in the UI component.

### 3. Syntax Error with Python 3 Walrus Operator Unpacking
**What happened:** While building Rohan's "Balance Breakdown" endpoint in `dashboard.py`, the AI wrote the following Python syntax: `for exp, group_name in paid_res_rows := paid_expenses_res.all():`. This is an invalid use of the assignment expression in Python unless explicitly wrapped in parentheses, leading to a fatal `SyntaxError`.
**How I caught it:** `uvicorn` completely crashed on hot-reload, dumping the SyntaxError traceback into my terminal. I immediately instructed the AI to check `dashboard.py` for errors.
**How it was fixed:** The AI reviewed the file, identified the invalid unpacking expression, removed the walrus operator entirely, and successfully restarted the Uvicorn server.
