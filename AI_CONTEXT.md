# AI_CONTEXT.md — Splitwise Clone: Full Project Context

> **Purpose:** This file is the single source of truth for the entire Splitwise Clone project.
> It is continuously updated throughout the build process. Another developer or AI agent
> should be able to read this file and recreate a near-identical application.

---

## Table of Contents

1. [Product Understanding](#1-product-understanding)
2. [User Personas](#2-user-personas)
3. [Product Scope — MVP](#3-product-scope--mvp)
4. [Core User Workflows](#4-core-user-workflows)
5. [Tech Stack](#5-tech-stack)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Balance Calculation Logic](#9-balance-calculation-logic)
10. [Real-Time Chat Architecture](#10-real-time-chat-architecture)
11. [Authentication Design](#11-authentication-design)
12. [Deployment Plan](#12-deployment-plan)
13. [Environment Variables](#13-environment-variables)
14. [Testing Plan](#14-testing-plan)
15. [Implementation Decisions](#15-implementation-decisions)
16. [Tradeoffs & Limitations](#16-tradeoffs--limitations)
17. [Prompts & AI Responses](#17-prompts--ai-responses)
18. [Changes During Implementation](#18-changes-during-implementation)
19. [Known Limitations](#19-known-limitations)

---

## 1. Product Understanding

### What is Splitwise?
Splitwise is a bill-splitting and expense-sharing application. It allows groups of people (friends, roommates, travel companions, colleagues) to track shared expenses and calculate who owes whom, minimizing the number of transactions needed to settle all debts.

### Core Problem It Solves
When multiple people share expenses (rent, groceries, trips, dinners), tracking who paid what and calculating individual debts manually is error-prone and creates social friction. Splitwise automates this by:
- Tracking all shared expenses in one place
- Automatically calculating net balances per person
- Simplifying debt chains (if A owes B and B owes C, Splitwise may suggest A pays C directly)
- Providing a clear settlement flow

### Key Observations from Studying the App
- Every expense belongs to a **group**
- Each expense has a **payer** (person who paid the bill) and **participants** (people sharing the cost)
- Split can be: equal, unequal (custom amounts), by percentage, or by shares
- Balances are shown both **per group** and as a **global summary** across all groups
- Users can **settle up** by recording a payment — this reduces the balance
- Each expense has a **comments/chat thread** for context and communication
- The app uses **debt simplification** to reduce the number of transactions needed

---

## 2. User Personas

### Persona 1 — The Roommate
- **Name:** Priya, 23, Software Developer
- **Use Case:** Splits monthly rent, groceries, electricity, and internet bills with 3 roommates
- **Pain Point:** Hard to remember who paid what last month
- **Key Need:** Recurring group, easy equal splits, quick settlement recording

### Persona 2 — The Trip Organizer
- **Name:** Arjun, 27, Product Manager
- **Use Case:** Organizes a Goa trip with 6 friends, pays for hotel, food, activities
- **Pain Point:** Some people paid more upfront; balancing is complex
- **Key Need:** Multiple split types, group balances, one-time settlement at the end

### Persona 3 — The Casual Friend
- **Name:** Sneha, 25, Designer
- **Use Case:** Splits dinner bills and movie tickets occasionally
- **Pain Point:** Awkward to ask for money directly
- **Key Need:** Simple equal splits, low friction, clear "who owes me" view

---

## 3. Product Scope — MVP

### ✅ IN SCOPE

| Feature | Details |
|---|---|
| Authentication | Email + password signup/login via Supabase Auth |
| Groups | Create, view, invite members by email, remove members |
| Expenses | Create with title, amount, payer, participants, split type |
| Split Types | Equal, Unequal (custom), Percentage, By Share |
| Balances | Group-level balance summary + individual net balance across all groups |
| Settlements | Record a payment between two users to reduce balance |
| Chat | Real-time comments on each expense using Supabase Realtime |
| Dashboard | Overview of all groups and total net balance |

### ❌ OUT OF SCOPE (Explicit Decisions)

| Feature | Reason |
|---|---|
| Email invite notifications | No email service configured; users must be pre-registered |
| Recurring expenses | Adds complexity; not in MVP |
| Expense edit / delete | Simplifies balance recalculation; out of MVP |
| Currency conversion | Fixed to INR (₹) throughout |
| Debt simplification algorithm | Simplified version only; no cross-group simplification |
| Mobile app | Web only |
| Push notifications | Out of scope |
| Export to CSV/PDF | Out of scope |
| Profile photos | Out of scope |
| Admin role management | All group members treated equally; creator is implicit admin |

### ⚠️ Assumptions Made

- A user must be registered before they can be added to a group
- The person who creates a group is its admin (can remove members)
- Only full settlement amounts are supported (no partial settlements)
- Currency is fixed to INR (₹)
- A user can only be in a group once
- The payer of an expense must be a member of that group
- Messages in chat are not editable or deletable
- Balance updates happen immediately after expense or payment creation (no async queue)

---

## 4. Core User Workflows

### Workflow 1 — Registration & Login
```
1. User visits /signup
2. Enters name, email, password
3. Supabase creates auth user + inserts row in public.users table
4. Redirected to /dashboard
---
1. User visits /login
2. Enters email, password
3. Supabase returns JWT session
4. Redirected to /dashboard
```

### Workflow 2 — Create a Group and Add Members
```
1. User clicks "New Group" on dashboard
2. Enters group name
3. Optionally enters emails of members to add
4. System looks up each email in public.users table
5. If found → adds to group_members
6. If not found → shows error "User not registered"
7. Group appears on dashboard for all members
```

### Workflow 3 — Add an Expense
```
1. User opens a group → clicks "Add Expense"
2. Fills in:
   - Title (e.g. "Dinner at Olive")
   - Total amount (e.g. ₹900)
   - Paid by (dropdown of group members)
   - Split type (equal / unequal / percentage / share)
   - Split values (auto-calculated or manually entered)
3. System validates splits sum to total amount
4. Inserts row in expenses table
5. Inserts rows in expense_splits (one per participant)
6. Balance summary updates immediately
```

### Workflow 4 — View Balances
```
Group View:
- Shows each member's net balance within the group
- Positive = is owed money; Negative = owes money

Dashboard View:
- Shows global net balance across all groups
- Shows simplified list: "You owe X ₹500", "Y owes you ₹300"
```

### Workflow 5 — Settle a Debt
```
1. User goes to group or dashboard
2. Clicks "Settle Up"
3. Selects: Payer → Receiver → Amount
4. Records payment → inserts row in payments table
5. Balance updates immediately
```

### Workflow 6 — Chat on an Expense
```
1. User opens an expense detail page
2. Sees existing messages in chronological order
3. Types a message → clicks Send
4. Message inserted in DB via Supabase
5. All other users in the group see it instantly via Supabase Realtime
6. No edit or delete on messages
```

---

## 5. Tech Stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Frontend Framework | React + Vite | Latest | Fast client-side rendering and build times |
| Backend Framework | FastAPI | Latest | Fast, typed Python API |
| Language | TypeScript (Frontend) / Python (Backend) | Latest | Type safety and performance |
| Database | PostgreSQL | Latest | Relational data integrity |
| ORM | SQLAlchemy + Alembic | Latest | Robust Python ORM and migration management |
| Auth | JWT Authentication | Custom | Token-based auth in FastAPI |
| Styling | Tailwind CSS + shadcn/ui | Latest | Fast UI, pre-built accessible components |
| State Management | React Query + React Context | Latest | Server state management and local state |

---

## 6. Database Schema

### Overview of Tables
```
users
groups
group_members
expenses
expense_splits
payments
messages
```

---

### Table: users
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- Note: id matches Supabase Auth UID exactly
```

### Table: groups
```sql
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: group_members
```sql
CREATE TABLE group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

### Table: expenses
```sql
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  amount      DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  paid_by     UUID NOT NULL REFERENCES users(id),
  split_type  TEXT NOT NULL CHECK (split_type IN ('equal', 'unequal', 'percentage', 'share')),
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: expense_splits
```sql
CREATE TABLE expense_splits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  amount_owed   DECIMAL(12, 2) NOT NULL CHECK (amount_owed >= 0),
  UNIQUE(expense_id, user_id)
);
-- Note: amount_owed is the final calculated amount, regardless of split_type
-- split_type is stored on expenses; splits table only stores final amounts
```

### Table: payments
```sql
CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by     UUID NOT NULL REFERENCES users(id),
  paid_to     UUID NOT NULL REFERENCES users(id),
  amount      DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: messages
```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Entity Relationship Summary
```
users ──< group_members >── groups
users ──< expenses (paid_by)
groups ──< expenses
expenses ──< expense_splits >── users
groups ──< payments
payments >── users (paid_by, paid_to)
expenses ──< messages >── users
```

---

## 7. API Design

All API routes are under `/api/` using Next.js App Router Route Handlers.
All routes require authentication via Supabase session (JWT in cookie).

---

### Auth Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login existing user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user info |

**POST /api/auth/signup**
```json
Request:  { "name": "Priya", "email": "priya@email.com", "password": "secure123" }
Response: { "user": { "id": "uuid", "name": "Priya", "email": "priya@email.com" } }
Errors:   400 (validation), 409 (email exists), 500
```

---

### Group Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/groups` | List all groups for current user |
| POST | `/api/groups` | Create a new group |
| GET | `/api/groups/:id` | Get group details + members |
| DELETE | `/api/groups/:id` | Delete group (admin only) |
| POST | `/api/groups/:id/members` | Add member by email |
| DELETE | `/api/groups/:id/members/:userId` | Remove member |
| GET | `/api/groups/:id/balances` | Get balance summary for group |

**POST /api/groups**
```json
Request:  { "name": "Goa Trip", "memberEmails": ["arjun@x.com", "sneha@x.com"] }
Response: { "group": { "id": "uuid", "name": "Goa Trip", "members": [...] } }
Errors:   400, 401, 404 (user not found for email)
```

**GET /api/groups/:id/balances**
```json
Response: {
  "balances": [
    { "userId": "uuid", "name": "Priya", "netAmount": 500.00 },
    { "userId": "uuid", "name": "Arjun", "netAmount": -300.00 },
    { "userId": "uuid", "name": "Sneha", "netAmount": -200.00 }
  ]
}
// Positive = is owed; Negative = owes
```

---

### Expense Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/groups/:id/expenses` | List all expenses in group |
| POST | `/api/groups/:id/expenses` | Create new expense |
| GET | `/api/expenses/:id` | Get single expense details + splits |
| GET | `/api/expenses/:id/messages` | Get chat messages for expense |
| POST | `/api/expenses/:id/messages` | Post new chat message |

**POST /api/groups/:id/expenses**
```json
Request: {
  "title": "Hotel Booking",
  "amount": 6000,
  "paidBy": "uuid-of-priya",
  "splitType": "equal",
  "participants": ["uuid1", "uuid2", "uuid3"],
  "splits": null  // null for equal; provide amounts for unequal/percentage/share
}

// For unequal:
"splits": [
  { "userId": "uuid1", "amount": 3000 },
  { "userId": "uuid2", "amount": 2000 },
  { "userId": "uuid3", "amount": 1000 }
]

// For percentage:
"splits": [
  { "userId": "uuid1", "percentage": 50 },
  { "userId": "uuid2", "percentage": 30 },
  { "userId": "uuid3", "percentage": 20 }
]

// For share:
"splits": [
  { "userId": "uuid1", "shares": 2 },
  { "userId": "uuid2", "shares": 1 },
  { "userId": "uuid3", "shares": 1 }
]

Response: { "expense": { "id": "uuid", "title": "...", "splits": [...] } }
Errors:   400 (splits don't sum to total), 401, 403 (not group member)
```

---

### Payment Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/groups/:id/payments` | Record a settlement payment |
| GET | `/api/groups/:id/payments` | List all payments in group |

**POST /api/groups/:id/payments**
```json
Request:  { "paidBy": "uuid", "paidTo": "uuid", "amount": 500, "note": "Settling Goa trip" }
Response: { "payment": { "id": "uuid", "amount": 500, ... } }
```

---

### Dashboard Route

| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Global balance summary across all groups |

**GET /api/dashboard**
```json
Response: {
  "totalNetBalance": 200.00,
  "owes": [
    { "userId": "uuid", "name": "Arjun", "amount": 300 }
  ],
  "owedBy": [
    { "userId": "uuid", "name": "Sneha", "amount": 100 }
  ]
}
```

---

## 8. Frontend Architecture

### Page Routes

| Route | Component | Description |
|---|---|---|
| `/` | `HomePage` | Landing page, redirect to /login |
| `/login` | `LoginPage` | Email + password login |
| `/signup` | `SignupPage` | Registration form |
| `/dashboard` | `DashboardPage` | All groups + global balance |
| `/groups/[id]` | `GroupPage` | Group details, members, expenses, balances |
| `/groups/[id]/expenses/[expenseId]` | `ExpensePage` | Expense detail + chat |

### Component Breakdown

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/page.tsx
├── groups/
│   ├── [id]/
│   │   ├── page.tsx              ← Group overview
│   │   └── expenses/
│   │       └── [expenseId]/
│   │           └── page.tsx      ← Expense detail + chat
└── api/
    ├── auth/...
    ├── groups/...
    ├── expenses/...
    └── dashboard/...

components/
├── ui/                           ← shadcn/ui components
├── GroupCard.tsx                 ← Group summary card on dashboard
├── ExpenseCard.tsx               ← Expense row in group page
├── ExpenseForm.tsx               ← Create expense modal with split logic
├── SplitCalculator.tsx           ← Dynamic split input based on split type
├── BalanceSummary.tsx            ← Shows who owes whom in a group
├── SettleUpModal.tsx             ← Record a payment modal
├── ChatBox.tsx                   ← Real-time chat component
├── MemberList.tsx                ← Group members with add/remove
└── Navbar.tsx                    ← Top nav with user info + logout
```

### State Management
- **Auth state:** Supabase client session, stored in React Context (`AuthContext`)
- **Group/expense data:** Fetched per-page via `useEffect` + `fetch()` to API routes
- **Chat messages:** Managed in local state, updated via Supabase Realtime subscription
- **No global state library** (Redux, Zustand) — app is simple enough for Context + local state

### Key UI Decisions
- All forms use controlled React components
- Split calculation in `SplitCalculator` component validates in real-time before submit
- Modals for expense creation and settle-up (no separate pages)
- Toast notifications for success/error feedback
- Loading skeletons for async data

---

## 9. Balance Calculation Logic

This is the most critical business logic in the app.

### Step 1: Calculate Raw Balances per User in a Group

```
For each user in the group:
  paid = SUM of expense.amount WHERE expense.paid_by = user (in this group)
  owed = SUM of expense_split.amount_owed WHERE expense_split.user_id = user
         (for expenses in this group)
  received = SUM of payments.amount WHERE payments.paid_to = user (in this group)
  sent = SUM of payments.amount WHERE payments.paid_by = user (in this group)

  net_balance = paid - owed + received - sent
```

### Step 2: Interpret Net Balance
```
net_balance > 0 → This user is OWED money (others owe them)
net_balance < 0 → This user OWES money (they owe others)
net_balance = 0 → Settled up
```

### Step 3: Generate Simplified "Who Owes Whom" List
```
Algorithm (Greedy):
1. Separate users into two lists: creditors (net > 0) and debtors (net < 0)
2. Sort both lists by absolute amount (descending)
3. Match largest debtor to largest creditor
4. Record transaction: debtor pays creditor MIN(|debtor_balance|, creditor_balance)
5. Reduce both balances; remove if zero
6. Repeat until all settled
```

### Example
```
Group: Goa Trip
- Priya paid ₹6000 for hotel (3 people = ₹2000 each)
- Arjun paid ₹3000 for food (3 people = ₹1000 each)

Raw:
  Priya:  paid 6000, owes 2000 (hotel) + 1000 (food) = net +3000
  Arjun:  paid 3000, owes 2000 (hotel) + 1000 (food) = net 0
  Sneha:  paid 0,    owes 2000 (hotel) + 1000 (food) = net -3000

Result: Sneha owes Priya ₹3000
```

### Where This Logic Lives
- Server-side in `/api/groups/:id/balances` route handler
- Runs as a pure function: `calculateGroupBalances(groupId)`
- Called fresh on every request (no caching in MVP)

---

## 10. Real-Time Chat Architecture

### Technology: Supabase Realtime
Supabase wraps PostgreSQL's logical replication into a WebSocket API.

### How It Works
```
1. Client subscribes to the messages table filtered by expense_id
2. When any INSERT happens on messages for that expense_id,
   Supabase pushes the new row to all subscribed clients
3. Client appends the new message to local state
```

### Client-Side Implementation (ChatBox.tsx)
```typescript
useEffect(() => {
  // 1. Fetch existing messages on mount
  fetchMessages(expenseId);

  // 2. Subscribe to new messages
  const channel = supabase
    .channel(`expense-chat-${expenseId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `expense_id=eq.${expenseId}`
    }, (payload) => {
      setMessages(prev => [...prev, payload.new]);
    })
    .subscribe();

  // 3. Cleanup on unmount
  return () => { supabase.removeChannel(channel); };
}, [expenseId]);
```

### Supabase Config Required
- Enable Realtime on the `messages` table in Supabase dashboard
- Set up Row Level Security (RLS) policy: users can only read messages
  for expenses in groups they belong to

---

## 11. Authentication Design

### Provider: Supabase Auth
- Email + password authentication
- JWT stored in HTTP-only cookie (managed by Supabase JS client)
- Session auto-refreshed by Supabase client

### Flow
```
Signup:
1. Call supabase.auth.signUp({ email, password })
2. On success, insert user row in public.users with same UUID as auth.uid
3. Redirect to /dashboard

Login:
1. Call supabase.auth.signInWithPassword({ email, password })
2. Supabase sets session cookie
3. Redirect to /dashboard

Logout:
1. Call supabase.auth.signOut()
2. Redirect to /login

Protected Routes:
- Middleware checks for valid session on all /dashboard and /groups routes
- Redirects to /login if no session found
```

### Row Level Security (RLS) Policies
All tables have RLS enabled. Key policies:

```sql
-- Users can only see groups they are members of
CREATE POLICY "members_can_view_group"
ON groups FOR SELECT
USING (
  id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Users can only see expenses in their groups
CREATE POLICY "members_can_view_expenses"
ON expenses FOR SELECT
USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Users can only send messages in expenses of their groups
CREATE POLICY "members_can_insert_messages"
ON messages FOR INSERT
WITH CHECK (
  expense_id IN (
    SELECT e.id FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE gm.user_id = auth.uid()
  )
);
```

---

## 12. Deployment Plan

### Services Used
| Service | Purpose | Tier |
|---|---|---|
| Vercel | Next.js hosting | Free (Hobby) |
| Supabase | PostgreSQL + Auth + Realtime | Free |
| GitHub | Code repository | Free |

### Deployment Steps

**Step 1: Supabase Setup**
```
1. Create project at supabase.com
2. Run schema SQL in Supabase SQL editor (all CREATE TABLE statements)
3. Enable Realtime on messages table
4. Configure RLS policies
5. Copy: Project URL, anon key, service role key
```

**Step 2: GitHub Setup**
```
1. Create public repo: splitwise-clone
2. Push all code
3. Ensure .env.local is in .gitignore
```

**Step 3: Vercel Deployment**
```
1. Connect GitHub repo to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy → get public URL
4. Test all features on production URL
```

**Step 4: Prisma Migration**
```bash
npx prisma generate
npx prisma db push  # pushes schema to Supabase PostgreSQL
```

---

## 13. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Database (for Prisma)
DATABASE_URL=postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres

# Next.js
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-random-secret-string
```

---

## 14. Testing Plan

### Manual Test Cases

**Auth**
- [ ] Register with new email → lands on dashboard
- [ ] Register with duplicate email → shows error
- [ ] Login with correct credentials → success
- [ ] Login with wrong password → shows error
- [ ] Access /dashboard without login → redirected to /login

**Groups**
- [ ] Create a group → appears on dashboard
- [ ] Add member by email → they see the group
- [ ] Add member with unregistered email → error shown
- [ ] Remove member → they no longer see the group
- [ ] Non-admin cannot remove members

**Expenses — Equal Split**
- [ ] Add ₹300 expense, 3 members → each owes ₹100
- [ ] Payer shows as owed ₹200 net (paid 300, owes 100)

**Expenses — Unequal Split**
- [ ] Add ₹900 expense, splits: ₹500/₹300/₹100 → sum validates correctly
- [ ] Mismatched sum → error before submit

**Expenses — Percentage Split**
- [ ] Add ₹1000 expense, 50%/30%/20% → splits = ₹500/₹300/₹200
- [ ] Percentages not summing to 100% → error

**Expenses — Share Split**
- [ ] Add ₹400, shares 2/1/1 → splits = ₹200/₹100/₹100

**Balances**
- [ ] After adding expenses, balances match manual calculation
- [ ] Balance updates immediately after adding expense

**Settlements**
- [ ] Record ₹100 payment from A to B → A's balance increases by 100, B's decreases
- [ ] Settlement appears in payment history

**Chat**
- [ ] Send message on expense → appears instantly for other logged-in user
- [ ] Messages persist after page refresh

---

## 15. Implementation Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| ORM | Prisma | Type safety, clean migrations, better DX than raw SQL |
| Auth provider | Supabase Auth | Avoids building auth from scratch; handles JWTs, sessions |
| Real-time | Supabase Realtime | No need for separate WebSocket server (Socket.io, etc.) |
| Split storage | Store final amounts only | Simplifies balance queries; split_type on expense for reference |
| Balance calculation | Server-side on each request | Keeps data always fresh; acceptable at this scale |
| Invite system | Email lookup only | No email sending service needed |
| Rounding | Round to 2 decimal places on server | Avoids floating point drift in DB |
| UI component library | shadcn/ui | Accessible, unstyled base, works well with Tailwind |
| State management | React Context only | App state is simple; no need for Zustand/Redux |
| Chat history | Load all on page open | Simple; pagination out of MVP scope |

---

## 16. Tradeoffs & Limitations

### Tradeoffs Made

| Tradeoff | What Was Simplified | Impact |
|---|---|---|
| Invite by email only | No email sending | Users must pre-register |
| No expense edit/delete | Simpler consistency | Less flexibility for users |
| Full settlement only | No partial settle | Minor UX limitation |
| Balance recalculated fresh every request | No caching | Slower at scale (fine for MVP) |
| No debt simplification across groups | Simpler algorithm | Balances shown per group only |
| Fixed INR currency | No conversion logic | Not usable internationally |

### What Was Hardcoded
- Currency: INR (₹)
- Max message length: 500 characters (front-end validation)
- Group member limit: not enforced (practical limit ~50)

### What Would Be Improved with More Time
- Debt simplification algorithm (greedy cross-user, cross-group)
- Expense edit and delete with balance recalculation
- Email notifications for new expenses
- Pagination for large expense lists
- Unit and integration tests (Jest + Playwright)
- Mobile responsive design improvements
- Partial settlement support
- Recurring expenses

---

## 17. Prompts & AI Responses

### Opening Prompt (Required by Assignment)
```
"You are a junior engineer helping me complete an internship assignment.
The assignment is to reverse engineer Splitwise, scope a realistic 3-day version,
and build a working deployed app.

Important instructions:
1. Do not assume product requirements.
2. Do not jump directly into implementation.
3. Ask me detailed questions about product scope, UX, workflows, edge cases,
   and engineering decisions.
[...full prompt as given in assignment...]"
```

**AI Response Summary:** Claude asked 47 questions across product goals, user personas, data model, auth approach, split types, balance algorithm, real-time requirements, deployment preferences, and testing expectations.

---

### Key Prompt: Defining Split Types
```
Prompt: "Split types should be: equal (auto-divide), unequal (manual per-person
amounts), percentage (user enters % per person), and by share (user enters
integer shares, system divides proportionally)"

AI Response: Updated expense_splits schema to store only final amount_owed.
Added validation that: unequal splits sum = total, percentages sum = 100,
shares are positive integers.
```

### Key Prompt: Balance Algorithm
```
Prompt: "Calculate balance as: for each user, sum all expense amounts they paid,
subtract all expense_split amounts they owe, add payments received,
subtract payments sent. Positive = owed, negative = owes."

AI Response: Implemented calculateGroupBalances() pure function in
/lib/balance.ts, called from /api/groups/:id/balances route.
```

### Key Prompt: Real-Time Chat
```
Prompt: "Use Supabase Realtime for chat. Subscribe to INSERT events on messages
table filtered by expense_id. Update local state when new message arrives."

AI Response: Implemented ChatBox.tsx with useEffect subscription and cleanup.
```

---

## 18. Changes During Implementation

| Change | Original Plan | Final Decision | Reason |
|---|---|---|---|
| Auth | Custom JWT with NextAuth | Supabase Auth | Simpler, less code, built-in session management |
| Messages scope | Group-level chat | Expense-level chat | Matches Splitwise behavior; more contextual |
| Split storage | Store split_type params | Store final amount_owed | Simpler balance queries |
| Invite flow | Send email invite link | Email lookup only | No email service in MVP |
| Balance page | Separate /balances route | Inline in group page | Better UX, fewer clicks |

---

## 19. Known Limitations

- No email notifications when added to a group or expense
- Chat history is loaded entirely on page open (no pagination)
- Balances not simplified across groups
- No expense edit or delete
- No mobile-optimized layout
- No unit or integration tests written
- Currency hardcoded to INR
- Settlement only supports full amounts
- Group creator cannot leave their own group
- No activity log or expense history timeline

---

*Last updated: During deployment phase*
*AI Tool Used: Claude (claude.ai)*
*Version: 1.0.0*
