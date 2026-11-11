# Setup guide

## Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+ (MySQL Workbench optional)

## 1. Database
In MySQL Workbench, open and execute in this order:
1. `database/schema.sql` (creates the `finguard` database, all tables, audit triggers)
2. `database/indexes.sql`
3. `database/seed.sql` (roles and permissions)

Or from a terminal: `mysql -u root -p < database/schema.sql` and so on.

## 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```
Edit `.env`:
- `DATABASE_URL`: your MySQL user and password
- `JWT_SECRET`: a long random string, e.g. `python -c "import secrets; print(secrets.token_urlsafe(48))"`

Start: `uvicorn app.main:app --reload --port 8000`. Interactive API docs at http://localhost:8000/docs.

PaddleOCR and PaddlePaddle are not in `requirements.txt` yet because they are large; install them when Phase 3 begins.

## 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
The dev server proxies `/api` to port 8000, so the refresh cookie stays same-origin.

## 4. First login
Either click **Open a workspace** on the login page, or:
```bash
cd backend
python -m scripts.create_admin --company "Acme Industries Pvt Ltd" --name "Your Name" --email you@example.com
```
A new company starts with six departments, five designations (illustrative limits ₹5,000 to unlimited) and nine expense categories, all editable from the app.

## Production notes
- Set `COOKIE_SECURE=true` and serve over HTTPS.
- Set `CORS_ORIGINS` to your real frontend origin.
- Login rate limiting is not implemented yet; put the API behind a gateway or add it in Phase 8.
