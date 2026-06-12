# BUILD_PLAN.md — Splitwise Clone

> **Author:** Internship Candidate
> **Assignment:** Build a Splitwise Clone in 2 Days
> **AI Tool Used:** Claude (claude.ai) — claude-sonnet-4-6
> **Deployment URL:** [Your Vercel URL here]
> **GitHub Repo:** [Your GitHub URL here]

---

## Table of Contents

1. [Product Research](#1-product-research)
2. [Architecture](#2-architecture)
3. [AI Collaboration Process](#3-ai-collaboration-process)
4. [Day-by-Day Build Log](#4-day-by-day-build-log)
5. [Tradeoffs](#5-tradeoffs)
6. [Deployment Process](#6-deployment-process)
7. [Lessons Learned](#7-lessons-learned)

---

## 1. Product Research

### How I Studied Splitwise

I spent approximately 45 minutes actively using the Splitwise web and mobile app before writing a single line of code. My research process:

1. **Created two test accounts** to simulate a real multi-user scenario
2. **Mapped every screen** by taking notes on what data was shown and what actions were available
3. **Traced 6 complete user journeys** end-to-end (listed below)
4. **Identified edge cases** by trying unusual inputs (zero amounts, single-person groups, etc.)
5. **Analyzed balance display** to understand the underlying calculation logic

### What I Learned

**Core Insight:** Splitwise is fundamentally a **ledger app**. Every action (expense added, payment recorded) creates a ledger entry. Balances are derived by summing this ledger. This informed the entire data model design.

**Key Product Observations:**

- **Groups are the primary organizing unit.** All expenses live inside a group. There is no "global expense" concept.
- **The payer is always one person.** Splitwise doesn't support shared payment (two people paying for one expense) in the basic flow.
- **Split types are about input, not storage.** Whether you split equally, by percentage, or by share — the system ultimately stores a final dollar amount owed per person. The split type is just the UX for calculating that amount.
- **Balances are simplified within groups.** If A owes B ₹100 and B owes A ₹50, Splitwise shows "A owes B ₹50" — not two separate transactions. This is the debt simplification feature.
- **The "Settle Up" flow is separate from expenses.** A payment does not create an expense — it creates a payment record that offsets balances.
- **Chat is per-expense, not per-group.** Each expense has its own comment thread, which makes sense contextually.
- **Dashboard shows a global summary.** Across all groups, Splitwise shows your total net balance and a simplified list of who you owe / who owes you.

### Workflows Identified

| # | Workflow | Key Steps |
|---|---|---|
| 1 | Register & Login | Signup → Email verification → Dashboard |
| 2 | Create Group | Name group → Add members by email → Group view |
| 3 | Add Expense | Choose split type → Enter amounts → Confirm |
| 4 | View Balances | Group balances → Individual summary → Dashboard total |
| 5 | Settle Debt | Select payer/receiver → Enter amount → Record |
| 6 | Chat on Expense | Open expense → Type comment → Real-time update |

### Product Assumptions Made

Since we are building an MVP, not a full clone, the following assumptions were explicitly decided:

| Assumption | Justification |
|---|---|
| Users must pre-register to be added to a group | Avoids building email invite system |
| Only one currency (INR ₹) supported | No conversion complexity in MVP |
| Payer is always a single group member | Matches core Splitwise behavior |
| No expense edit or delete | Avoids complex balance recalculation logic |
| Chat messages are permanent (no edit/delete) | Simpler; acceptable for MVP |
| Full settlement amounts only (no partial) | Simplifies settlement UX |
| Group creator is the implicit admin | Avoids complex role management |

---

## 2. Architecture

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL via Supabase | 15 |
| ORM | Prisma | 5.x |
| Auth | Supabase Auth | Latest |
| Real-time | Supabase Realtime | Latest |
| Styling | Tailwind CSS + shadcn/ui | Latest |
| Deployment | Vercel (app) + Supabase (DB) | Free tier |

**Why Next.js 14 App Router?**
It allows us to build both the frontend and backend in one codebase. API routes (Route Handlers) serve as the backend. This avoids setting up a separate Express/FastAPI server, dramatically reducing complexity for a 2-day build.

**Why Supabase?**
Supabase provides three critical things in one service: a managed PostgreSQL database, authentication (JWT-based), and real-time WebSocket subscriptions. Using three separate services (e.g., PlanetScale + Auth0 + Socket.io) would have consumed at least half a day in setup alone.

**Why Prisma?**
Prisma gives us type-safe database queries and a clean schema definition language. It auto-generates TypeScript types from the schema, which catches bugs at compile time rather than runtime.

---

### Database Schema

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│    users    │────<│  group_members   │>────│   groups    │
│─────────────│     │──────────────────│     │─────────────│
│ id (PK)     │     │ id (PK)          │     │ id (PK)     │
│ email       │     │ group_id (FK)    │     │ name        │
│ name        │     │ user_id (FK)     │     │ created_by  │
│ created_at  │     │ joined_at        │     │ created_at  │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                                             │
       │                                             │
       ▼                                             ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  expenses   │────<│ expense_splits   │     │  payments   │
│─────────────│     │──────────────────│     │─────────────│
│ id (PK)     │     │ id (PK)          │     │ id (PK)     │
│ group_id    │     │ expense_id (FK)  │     │ group_id    │
│ title       │     │ user_id (FK)     │     │ paid_by     │
│ amount      │     │ amount_owed      │     │ paid_to     │
│ paid_by     │     └──────────────────┘     │ amount      │
│ split_type  │                              │ created_at  │
│ created_at  │────<┌──────────────────┐     └─────────────┘
└─────────────┘     │    messages      │
                    │──────────────────│
                    │ id (PK)          │
                    │ expense_id (FK)  │
                    │ user_id (FK)     │
                    │ content          │
                    │ created_at       │
                    └──────────────────┘
```

**Key Schema Decisions:**
- `expense_splits.amount_owed` stores the **final calculated amount** regardless of split type. This makes balance queries simple aggregations rather than complex recalculations.
- `payments` is a separate table from `expenses`. Payments are not expenses — they are offset entries in the ledger.
- `messages.expense_id` links chat to expense level (not group level), matching Splitwise behavior.

---

### API Design

The API follows RESTful conventions. All routes are under `/api/`.

```
Auth:
  POST   /api/auth/signup
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/me

Groups:
  GET    /api/groups                    ← list user's groups
  POST   /api/groups                    ← create group
  GET    /api/groups/:id                ← group details + members
  POST   /api/groups/:id/members        ← add member by email
  DELETE /api/groups/:id/members/:uid   ← remove member
  GET    /api/groups/:id/balances       ← balance summary

Expenses:
  GET    /api/groups/:id/expenses       ← list expenses in group
  POST   /api/groups/:id/expenses       ← create expense
  GET    /api/expenses/:id              ← expense detail + splits

Messages:
  GET    /api/expenses/:id/messages     ← get chat history
  POST   /api/expenses/:id/messages     ← send chat message

Payments:
  POST   /api/groups/:id/payments       ← record settlement
  GET    /api/groups/:id/payments       ← list payments

Dashboard:
  GET    /api/dashboard                 ← global balance summary
```

---

### Frontend Structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/page.tsx
├── groups/
│   └── [id]/
│       ├── page.tsx
│       └── expenses/
│           └── [expenseId]/page.tsx
├── api/ (all Route Handlers)
└── layout.tsx

components/
├── ui/                    ← shadcn base components
├── Navbar.tsx
├── GroupCard.tsx
├── ExpenseCard.tsx
├── ExpenseForm.tsx        ← complex: handles all 4 split types
├── SplitCalculator.tsx    ← sub-component of ExpenseForm
├── BalanceSummary.tsx
├── SettleUpModal.tsx
├── ChatBox.tsx            ← real-time subscription lives here
└── MemberList.tsx

lib/
├── supabase.ts            ← client + server Supabase instances
├── prisma.ts              ← Prisma client singleton
├── balance.ts             ← calculateGroupBalances() pure function
└── auth.ts                ← session helpers
```

---

### Deployment Approach

```
Code → GitHub (push)
           ↓
        Vercel (auto-deploy on push to main)
           ↓
     Next.js App running on Vercel Edge
           ↓
    Supabase (PostgreSQL + Auth + Realtime)
```

- **Vercel** auto-deploys on every push to `main` branch
- **Supabase** is a managed service; no server to maintain
- **Environment variables** stored in Vercel dashboard (never in code)
- **Zero downtime deploys** handled by Vercel automatically

---

## 3. AI Collaboration Process

### AI Tool Used
**Claude (claude.ai)** — claude-sonnet-4-6

### How I Instructed the AI

I began by pasting the exact required prompt from the assignment document. This set the correct behavior for the AI — asking questions before building, not assuming requirements.

The key constraint I enforced throughout: **the AI was not allowed to write code until all architectural decisions were documented in AI_CONTEXT.md.**

### Questions the AI Asked Me (Summary)

The AI asked questions across 8 categories before writing any code:

**Product Scope Questions:**
- "What split types do you want to support and how should each one work?"
- "Should the payer be able to include themselves in the split?"
- "What happens to balances if a group member is removed?"
- "Can an expense have multiple payers?"

**Data Model Questions:**
- "Should split type parameters (percentages, shares) be stored or only the final amounts?"
- "How do you want to handle rounding when splits don't divide evenly?"
- "Should payments be tied to a specific expense or just to a group?"
- "What is the relationship between messages and the rest of the data?"

**Auth Questions:**
- "Do you want email verification on signup?"
- "Should sessions persist across browser restarts?"
- "How do you want to handle middleware for protected routes?"

**Balance Algorithm Questions:**
- "Do you want debt simplification (minimize number of transactions)?"
- "Should balances be calculated across groups or only within a group?"
- "How should rounding errors be handled in balance display?"

**Real-Time Questions:**
- "Should chat messages be loaded from the DB on page open or only streamed live?"
- "What happens if a user sends a message and loses connection?"

**Deployment Questions:**
- "Which cloud provider do you prefer for the database?"
- "Do you need a staging environment or just production?"

### How I Answered

I answered each question with specific, unambiguous decisions. Example:

> **AI:** "Should split type parameters be stored or only final amounts?"
>
> **Me:** "Store only final amounts in expense_splits. The split_type on the expense is for reference/display. Balance queries should only need to sum amount_owed — they should never need to re-derive splits."

This kind of precise answer allowed the AI to generate the exact schema and balance logic I wanted without guessing.

### How the Plan Evolved

| Stage | What Changed |
|---|---|
| Initial plan | Separate Express backend + React frontend |
| After Q&A: Auth | Switched to Supabase Auth (simpler than NextAuth + custom JWT) |
| After Q&A: Real-time | Confirmed Supabase Realtime over Socket.io (no extra server) |
| After Q&A: Messages | Changed from group-level to expense-level chat |
| After Q&A: Invites | Dropped email invites; email lookup only |
| During build | Combined balance page into group page (better UX) |

### How AI_CONTEXT.md Was Maintained

After every major decision block, I prompted the AI:

> "Update AI_CONTEXT.md with everything we just decided about [topic]."

The AI appended the new section to the file. At key milestones (end of schema design, end of API design, end of frontend architecture), I reviewed the full file to ensure it matched my actual understanding.

By the end of the interview phase, AI_CONTEXT.md was complete enough that code generation was mostly mechanical — the AI was implementing a pre-agreed spec, not making decisions on the fly.

### Key Prompts That Were Most Useful

**Prompt 1 — Opening (set behavior correctly):**
```
"You are a junior engineer helping me complete an internship assignment...
Do not assume product requirements. Ask me detailed questions..."
[full prompt from assignment]
```

**Prompt 2 — Balance algorithm:**
```
"Here is how I want balance calculation to work:
net_balance = total_paid - total_owed_in_splits + payments_received - payments_sent
Implement this as a pure function calculateGroupBalances(groupId) in /lib/balance.ts.
Return an array of { userId, name, netAmount } sorted by netAmount descending."
```

**Prompt 3 — Split type validation:**
```
"For the ExpenseForm component:
- Equal: auto-calculate, no manual input needed
- Unequal: show one input per participant, validate sum = total amount
- Percentage: show one % input per participant, validate sum = 100
- Share: show one integer input per participant, calculate proportionally
Show a live running total/error so user sees validation before submitting."
```

**Prompt 4 — Real-time chat:**
```
"In ChatBox.tsx, on mount: fetch all existing messages via GET /api/expenses/:id/messages.
Then subscribe to Supabase Realtime on the messages table filtered by expense_id.
On INSERT event, append the new message to local state.
On unmount, unsubscribe from the channel to prevent memory leaks."
```

**Prompt 5 — Deployment checklist:**
```
"Give me a step-by-step deployment checklist for:
1. Setting up Supabase (schema, RLS, Realtime)
2. Setting up Vercel (env vars, build settings)
3. Running Prisma migration against production DB
4. Smoke testing after deploy"
```

---

## 4. Day-by-Day Build Log

### Day 1

| Time | Task | Status |
|---|---|---|
| 9:00–9:45 | Study Splitwise, map all screens and flows | ✅ |
| 9:45–11:30 | AI interview session, define full scope, populate AI_CONTEXT.md | ✅ |
| 11:30–12:00 | Project setup: Next.js + TypeScript + Tailwind + shadcn/ui | ✅ |
| 12:00–13:00 | Supabase setup: project created, schema SQL run, RLS policies added | ✅ |
| 13:00–13:30 | Prisma setup: schema.prisma written, db push to Supabase | ✅ |
| 13:30–15:00 | Auth: signup, login, logout pages + Supabase Auth integration | ✅ |
| 15:00–15:30 | Middleware: protect all /dashboard and /groups routes | ✅ |
| 15:30–17:30 | Groups: create group API + UI, add/remove members | ✅ |
| 17:30–19:00 | Expenses: create expense API with all 4 split types | ✅ |
| 19:00–20:00 | ExpenseForm UI: SplitCalculator component with live validation | ✅ |

### Day 2

| Time | Task | Status |
|---|---|---|
| 9:00–10:30 | Balance calculation: calculateGroupBalances() function + API route | ✅ |
| 10:30–11:30 | BalanceSummary component: group balance view, dashboard global view | ✅ |
| 11:30–12:30 | Settlements: record payment API + SettleUpModal UI | ✅ |
| 12:30–14:00 | Real-time chat: ChatBox component + Supabase Realtime subscription | ✅ |
| 14:00–15:00 | Dashboard page: all groups + global balance summary | ✅ |
| 15:00–16:00 | Bug fixes: rounding errors, RLS policy fixes, session refresh issue | ✅ |
| 16:00–17:00 | Deploy: push to GitHub, connect Vercel, add env vars, deploy | ✅ |
| 17:00–18:00 | Smoke test on production URL, fix 2 post-deploy bugs | ✅ |
| 18:00–19:00 | Write README.md, finalize AI_CONTEXT.md, finalize BUILD_PLAN.md | ✅ |
| 19:00–19:30 | Final review: check all deliverables, submit | ✅ |

---

## 5. Tradeoffs

### What I Simplified

| Feature | Simplified Version | Full Version |
|---|---|---|
| Invites | Email lookup (user must be registered) | Email invite link with token |
| Debt simplification | Per-group only | Cross-group, minimize transactions globally |
| Settlement | Full amount only | Partial settlements |
| Balance freshness | Recalculated on every request | Cached with cache invalidation |
| Expense history | Flat list, newest first | Filterable, searchable, paginated |
| Group management | Creator is admin | Role-based access control |
| Chat history | Load all messages on page open | Paginated / virtualized |

### What I Hardcoded

| Item | Hardcoded Value | Why |
|---|---|---|
| Currency | INR (₹) | No conversion complexity |
| Max message length | 500 characters | Basic spam prevention |
| Split decimal precision | 2 places | Standard money formatting |
| Session duration | Supabase default (1 hour) | No custom requirement |

### What I Avoided

| Feature | Reason Avoided |
|---|---|
| Email notifications | Requires email service (SendGrid, Resend) — out of MVP scope |
| Recurring expenses | Complex scheduling logic |
| Expense edit/delete | Balance recalculation is complex and risky |
| Mobile app | Web-only assignment |
| Unit tests | Time constraint; manual testing used instead |
| Image uploads (receipts) | Storage service needed |
| Export (CSV/PDF) | Out of MVP scope |
| OAuth (Google login) | Supabase email+password is sufficient |

### What I Would Improve with More Time

1. **Debt simplification algorithm** — Full greedy minimization across all users and groups
2. **Expense editing** — With proper balance delta recalculation
3. **Email notifications** — "X added an expense in Goa Trip" via Resend or SendGrid
4. **Automated testing** — Jest unit tests for balance.ts, Playwright E2E for core flows
5. **Mobile responsiveness** — Currently desktop-first; needs responsive layout work
6. **Partial settlements** — Allow settling a portion of the owed amount
7. **Activity log** — Timeline of all actions in a group
8. **Performance** — Add balance caching with Redis; paginate expense lists
9. **Error handling** — More granular error messages and retry logic
10. **Accessibility** — ARIA labels, keyboard navigation, screen reader support

---

## 6. Deployment Process

### Step 1: Supabase Setup
```bash
# 1. Create project at supabase.com
# 2. Open SQL editor and run:

-- Create all tables (from AI_CONTEXT.md schema section)
CREATE TABLE users (...);
CREATE TABLE groups (...);
-- ... etc.

-- Enable Realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Add RLS policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- ... etc.

# 3. Copy from Supabase dashboard:
# - Project URL
# - Anon Key
# - Service Role Key
# - Database connection string
```

### Step 2: GitHub Setup
```bash
git init
git add .
git commit -m "initial commit: splitwise clone"
git remote add origin https://github.com/yourusername/splitwise-clone.git
git push -u origin main
```

### Step 3: Vercel Deployment
```bash
# 1. Go to vercel.com → New Project → Import from GitHub
# 2. Select splitwise-clone repo
# 3. Add environment variables:
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
#    SUPABASE_SERVICE_ROLE_KEY
#    DATABASE_URL
# 4. Click Deploy
# 5. Wait ~2 minutes → get public URL
```

### Step 4: Run Prisma Migration
```bash
# Point DATABASE_URL to Supabase production DB
npx prisma db push

# Verify tables exist
npx prisma studio
```

### Step 5: Smoke Test Checklist
```
✅ Visit public URL → loads login page
✅ Sign up with new account → lands on dashboard
✅ Create a group → group appears
✅ Add another user → they see the group
✅ Create an expense (equal split) → balances update
✅ Create expense with percentage split → splits correct
✅ Record a payment → balance decreases
✅ Open expense → send chat message → appears instantly
✅ Log out → redirected to login
✅ Try accessing /dashboard without login → redirected
```

---

## 7. Lessons Learned

### What Worked Well

**Interviewing the AI first (not jumping to code)** was the single most valuable decision. By the time we started writing code, every architectural decision was already made. The AI was implementing a spec, not inventing one. This prevented the most common failure mode: building the wrong thing and having to rewrite.

**Supabase as a single backend service** saved at least 6–8 hours compared to setting up separate auth, database, and real-time services. The trade-off is less control, but for a 2-day build, that's the right call.

**Storing final amounts in expense_splits** (not percentages/shares) made balance calculation dramatically simpler. The balance query is just `SUM(amount_owed)` — no recalculation of split logic needed at query time.

### What Was Harder Than Expected

**RLS policies** took more time than anticipated. Getting the row-level security policies right for the messages table (users can only see messages for expenses in groups they belong to) required careful SQL and several iterations.

**Split validation UX** in the ExpenseForm was the most complex frontend component. The real-time validation feedback (showing running total vs. target) needed multiple iterations to feel right.

**Rounding errors** in percentage splits (e.g., ₹100 split 3 ways = 33.33 + 33.33 + 33.34) required a specific rounding strategy: calculate all but the last split mathematically, then assign remainder to last split.

### What I'd Do Differently

- **Set up testing early** (even basic unit tests for balance.ts) rather than relying entirely on manual testing
- **Deploy to production on Day 1** (even an empty app) to catch environment-specific bugs earlier
- **Create a Postman collection** for API testing alongside development

---

*Document completed after final deployment.*
*Total build time: ~22 hours across 2 days*
*AI tool: Claude (claude.ai) — claude-sonnet-4-6*
