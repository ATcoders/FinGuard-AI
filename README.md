# FinGuard AI

AI-powered invoice intelligence and financial governance platform.
Stack: React + plain CSS + Chart.js, FastAPI, MySQL, PaddleOCR, Isolation Forest + XGBoost.

## Build status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation: schema, JWT auth, RBAC, departments, designations, employees, dashboard shell | **Done** |
| 2 | Synthetic Indian dataset (100k+), Isolation Forest, XGBoost, evaluation, prediction API | Next |
| 3 | Invoice upload, PaddleOCR, field mapping, OCR review | Pending |
| 4 | Policy engine, duplicate detection, GST checks, PO/GRN matching | Pending |
| 5 | Vendor intelligence and risk | Pending |
| 6 | Dynamic approvals, escalation, simulated payments | Pending |
| 7 | Analytics, notifications, audit log viewer, reports | Pending |
| 8 | Testing, Docker, deployment docs | Pending |

Navigation only lists pages that exist. Nothing in the UI is a placeholder button.

## Quick start

See `docs/setup_guide.md`. In short:

```bash
# 1. database (MySQL 8)
mysql -u root -p < database/schema.sql
mysql -u root -p < database/indexes.sql
mysql -u root -p < database/seed.sql

# 2. backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # then edit DATABASE_URL and JWT_SECRET
uvicorn app.main:app --reload --port 8000

# 3. frontend (new terminal)
cd frontend
npm install
npm run dev                                            # http://localhost:5173
```

Open http://localhost:5173 and choose **Open a workspace** to register your company, or run
`python -m scripts.create_admin --company "Name" --name "You" --email you@example.com` from `backend/`.

## Design notes

- Ledger-paper theme: warm paper, ink navy, brass accents; serif headings, mono figures, hard-offset buttons.
- Access tokens are 15 minutes and held in memory. The refresh token is an httpOnly cookie, rotated on each use, stored hashed.
- Every query is company-scoped. Role checks run on the backend against the database role, not the token claim.
- `audit_logs` is append-only, enforced by MySQL triggers.
- Bank account numbers are stored encrypted (column type `VARBINARY`) with a SHA-256 hash for shared-account detection; encryption arrives with Phase 5.

## Verified so far

- Backend imports and registers all routes (checked via the OpenAPI schema).
- Frontend production build succeeds.
- **Not yet run against a live MySQL instance.** Run the setup steps above and tell me about any error.
