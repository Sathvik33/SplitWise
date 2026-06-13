# AI Usage Documentation

This document outlines the usage of AI tools during the development of the Shared Expenses App, detailing the tools used, key prompts provided, and instances where AI-generated output required human intervention and correction.

## 1. AI Tools Used
- **Agentic AI Coding Assistant**: Used for pair-programming, scaffolding the FastAPI backend, and generating React/TypeScript frontend components.
- **Tools Leveraged**: AI terminal execution, web search for React library documentation, automated code refactoring, and AI-driven rule-based anomaly detection engines.

---

## 2. Key Prompts

Rather than relying on granular, line-by-line code generation, the AI was guided using high-level architectural and logical prompts suitable for human evaluation:

* **Foundation & Architecture:** 
  > "Build a Shared Expenses App (Splitwise clone) using FastAPI for the backend and React/TypeScript for the frontend. The system must support user authentication, group creation, expense tracking, and settlement payments."

* **CSV Import Engine & Anomaly Detection:** 
  > "Implement a rule-based anomaly detection engine that parses `Expenses Export.csv`. It must identify edge cases like negative amounts, zero amounts, un-parseable dates, and members who left the group before an expense occurred. Provide a UI for the user to resolve these anomalies (e.g., manual input, convert to refund)."

* **Dashboard & Balancing Logic:**
  > "Create a dashboard that accurately calculates 'Who owes whom' by tracking both equal and unequal split types, as well as direct settlement payments between users."

---

## 3. Concrete Cases of AI Errors & Corrections

During development, the AI produced incorrect or incomplete code. Below are three key instances where human oversight caught the errors, and the corrective actions taken:

### Case 1: CSV Import Errors (Duplicate User Constraints)
* **What the AI did wrong:** When parsing the CSV, the AI correctly realized that `"Rohan"` and `"rohan "` (lowercase, trailing space) referred to the same person and mapped them to the same database user ID. However, when inserting members into the `group_members` table, the AI failed to deduplicate the IDs properly (due to mismatched `UUID` object vs. string types). This caused a PostgreSQL `uq_group_user` IntegrityError because it attempted to add the exact same user to the group twice.
* **How I caught it:** During end-to-end testing of the CSV import, the transaction crashed and rolled back. I checked the backend terminal and found the `duplicate key value violates unique constraint "uq_group_user"` traceback.
* **What I changed:** I directed the AI to investigate the constraint failure. We corrected the logic by forcing all UUIDs to be cast as raw strings inside a Python `set()` *before* iterating over them for database insertion, ensuring strict mathematical deduplication.

### Case 2: CORS Middleware Configuration
* **What the AI did wrong:** When scaffolding the initial FastAPI backend, the AI forgot to explicitly configure the Cross-Origin Resource Sharing (CORS) middleware. 
* **How I caught it:** When I booted up both the frontend and backend, the React application completely failed to communicate with the API. I opened the browser's Developer Tools and saw a barrage of red `CORS policy blocked` errors in the Network tab.
* **What I changed:** I instructed the AI to properly configure the backend to accept frontend traffic. The AI added `CORSMiddleware` to the FastAPI app instance, explicitly setting `allow_origins=["http://localhost:5173"]`, `allow_credentials=True`, and allowing all methods/headers.

### Case 3: Deployment & Hardcoded API URLs
* **What the AI did wrong:** In the frontend API service files, the AI initially hardcoded the backend URL (e.g., `http://localhost:8000/api`) directly into the Axios configuration, making it impossible to easily deploy or change ports without manually rewriting code.
* **How I caught it:** While preparing the application for a more robust deployment setup and reviewing the `dashboard.ts` service files, I noticed the hardcoded base URLs.
* **What I changed:** I prompted the AI to refactor the configuration to use environment variables. We replaced the hardcoded strings with `import.meta.env.VITE_API_URL`, ensuring the frontend dynamically points to the correct backend depending on the `.env` environment.
