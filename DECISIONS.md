# DECISIONS.md

## 1. Database Selection
**Decision:** Use PostgreSQL instead of SQLite or NoSQL.
**Options Considered:** SQLite, MySQL, PostgreSQL.
**Why:** The assignment explicitly required "relational DBs only". We chose PostgreSQL because it supports robust UUID column types natively, handles complex timezones and dates perfectly (crucial for timeline constraints), and scales better for concurrent concurrent WebSocket/FastAPI requests compared to SQLite locking.

## 2. Anomaly Handling Approach
**Decision:** Do not silently guess on anomalies; build an interactive review UI instead.
**Options Considered:** 
1. Auto-resolve based on rigid assumptions and import silently.
2. Crash the import entirely on the first error.
3. Parse the CSV, flag anomalies in an interactive report, propose the best logical fix, and let the user (Meera) explicitly approve or reject the automated resolution.
**Why:** The assignment explicitly stated "A crashed import and a silent guess are both failing answers," and Meera requested: "I want to approve anything the app deletes or changes." Therefore, Option 3 was the only valid engineering choice. We built a React frontend that surfaces the 12 problems and provides dropdown menus for the user to dictate the policy on a per-row basis.

## 3. Balance Calculation Logic ("No Magic Numbers")
**Decision:** Calculate global net balances dynamically on the fly, but provide raw traceable records via a dedicated Breakdown API.
**Options Considered:**
1. Store a running `current_balance` integer on the `User` table.
2. Dynamically calculate the balance by summing all expenses and payments on every request.
**Why:** Storing a running balance risks data desynchronization if a past expense is edited or deleted. We chose Option 2 (dynamic calculation). To satisfy Rohan's request ("No magic numbers"), we implemented an `/api/dashboard/breakdown` endpoint that returns the chronological, exact list of every raw expense and payment that makes up the user's net balance, surfaced in an interactive React modal.

## 4. Timeline Constraints (Join/Leave Dates)
**Decision:** Add `joined_at` and `left_at` metadata to the `group_members` bridging table.
**Options Considered:**
1. Rely entirely on the user to manually select the correct split members for every single expense.
2. Enforce timeline constraints at the database level.
**Why:** Sam complained about being charged for March electricity when he moved in mid-April. By adding timeline metadata to the `group_members` table, our Anomaly Engine automatically flags `MEMBER_OUT_OF_BOUNDS` when an expense date falls outside a user's residency timeline, proposing a fix to automatically remove them from the split.

## 5. UI / UX Design
**Decision:** Use a realistic, humanistic SaaS design.
**Why:** The instructions required acting as both Product Manager and Developer. A basic UI does not inspire confidence. We moved away from default "AI-looking" Tailwind classes and implemented a polished, high-end design using subtle glassmorphism, soft drop shadows, and modern typography to deliver a premium user experience.
