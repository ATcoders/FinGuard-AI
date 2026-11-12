# FinGuard AI

### AI-Powered Invoice Intelligence & Financial Governance Platform

FinGuard AI is a financial governance platform designed to automate invoice verification, detect suspicious transactions, assess vendor risks and manage financial approvals.

It combines OCR, machine learning and rule-based validation to make financial operations more secure, transparent and efficient.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?logo=github)](https://github.com/ATcoders/FinGuard-AI)

---

## Table of Contents

- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Key Features](#key-features)
- [Machine Learning](#machine-learning)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Build Progress](#build-progress)
- [Security](#security)
- [Contributing](#contributing)

---

## The Problem

Organisations process hundreds or thousands of invoices, and manual verification creates several challenges:

- Duplicate invoices and accidental payments.
- Incorrect invoice amounts and tax calculations.
- Unverified vendors and suspicious transactions.
- Expenses exceeding approved spending limits.
- Delayed approval processes.
- Lack of financial transparency and proper audit records.

## Our Solution

FinGuard AI provides a centralised platform that automates invoice processing and financial verification.

It extracts invoice information, checks financial policies, monitors vendor behaviour, detects unusual transactions and routes invoices through a configurable approval hierarchy.

The platform combines **two machine learning models with a rule-based validation engine** to support accurate and explainable financial decisions.

---

## Key Features

| Feature | Description |
|---|---|
| Invoice Intelligence | Extract invoice information from PDF and image files using OCR. |
| Flexible OCR Processing | Handle different vendor invoice layouts, field names and missing fields. |
| Duplicate Detection | Identify exact and potentially modified duplicate invoices. |
| Anomaly Detection | Identify unusual transaction amounts and vendor behaviour. |
| Vendor Intelligence | Maintain vendor history, verification status and risk information. |
| Financial Policy Engine | Enforce configurable spending limits and expense policies. |
| Dynamic Approval Hierarchy | Route invoices to the appropriate authority based on amount, role and department. |
| PO/GRN Matching | Compare purchase orders, goods received notes and invoices. |
| Payment Control | Hold payments until mandatory checks and approvals are completed. |
| Analytics Dashboard | Monitor expenses, approvals, vendors and financial risks. |
| Audit Logging | Maintain a history of important financial activities. |

---

## Machine Learning

FinGuard AI uses exactly two predictive ML models.

**1. Isolation Forest**
- Unsupervised anomaly detection.
- Identifies unusual invoice amounts and transaction patterns.
- Detects deviations from historical vendor behaviour.

**2. XGBoost**
- Supervised classification.
- Learns from labelled transaction data.
- Predicts whether a transaction may be suspicious.

Both model outputs are combined with deterministic business rules to generate an explainable risk assessment.

### Custom Dataset

The project is designed to use a large synthetic Indian business transaction dataset.

Planned dataset:
- 100,000+ invoice and transaction records.
- 1,000+ fictional vendors.
- Multiple departments and companies.
- 12–24 months of transaction history.
- Normal and suspicious transaction scenarios.
- Duplicate invoices, unusual billing and policy violations.

The dataset will be used for model training, testing and demonstration.

---

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, HTML, CSS, JavaScript |
| Charts | Chart.js |
| Backend | Python, FastAPI |
| Database | MySQL, SQL |
| OCR | PaddleOCR, OpenCV |
| Machine Learning | Isolation Forest, XGBoost |
| Data Processing | Pandas, NumPy, Scikit-learn |
| Authentication | JWT |
| Version Control | Git, GitHub |

---

## Project Structure

```text
FinGuard-AI/
│
├── backend/
│   ├── app/
│   ├── ml/
│   ├── data/
│   └── requirements.txt
│
├── database/
│   ├── schema.sql
│   ├── indexes.sql
│   └── seed.sql
│
├── docs/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Installation & Setup

### Prerequisites

Install the following before starting:

- [Python](https://www.python.org/downloads/)
- [Node.js](https://nodejs.org/)
- [MySQL 8](https://dev.mysql.com/downloads/installer/)
- [Git](https://git-scm.com/downloads/)

### Step 1. Clone the Repository

Open PowerShell or Windows Terminal and run:

```powershell
git clone https://github.com/ATcoders/FinGuard-AI.git
cd FinGuard-AI
```

### Step 2. Setup MySQL Database

Make sure your MySQL server is running.

Open a terminal in the project root directory and execute these commands one by one:

**Create database and tables**

```powershell
cmd /c "mysql -u root -p < database\schema.sql"
```

**Create indexes**

```powershell
cmd /c "mysql -u root -p < database\indexes.sql"
```

**Insert initial records**

```powershell
cmd /c "mysql -u root -p < database\seed.sql"
```

Enter your MySQL root password whenever prompted.

### Step 3. Setup Backend

In the same terminal, execute:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Open the `.env` file and configure the required environment variables, including:

- MySQL database connection details.
- JWT secret.
- Other required application settings.

Now start the backend:

```powershell
uvicorn app.main:app --reload --port 8000
```

**Check backend health:**

[http://localhost:8000/api/health](http://localhost:8000/api/health)

Expected response:

```json
{
  "status": "ok"
}
```

### Step 4. Start Frontend

Open a **second terminal** in the project root directory.

Run:

```powershell
cd frontend
npm install
npm run dev
```

Open the application:

**http://localhost:5173**

Choose **Open a workspace** to register your company.

Alternatively, create an admin account from the backend directory:

```powershell
python -m scripts.create_admin --company "Name" --name "You" --email you@example.com
```

For detailed configuration, refer to [docs/setup_guide.md](docs/setup_guide.md).

---

## Build Progress

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, database schema, JWT authentication, RBAC and dashboard shell | ✅ Done |
| 2 | Synthetic dataset, Isolation Forest, XGBoost and prediction API | 🔄 Next |
| 3 | Invoice upload, PaddleOCR and field mapping | ⏳ Pending |
| 4 | Policy engine, duplicate detection, GST checks and PO/GRN matching | ⏳ Pending |
| 5 | Vendor intelligence and risk assessment | ⏳ Pending |
| 6 | Dynamic approvals, escalation and simulated payments | ⏳ Pending |
| 7 | Analytics, notifications, audit logs and reports | ⏳ Pending |
| 8 | Testing, Docker and deployment documentation | ⏳ Pending |

*Development status will be updated as each phase is completed.*

---

## Security

Current security implementation includes:

- JWT authentication with 15-minute access tokens.
- Refresh tokens stored in HTTP-only cookies and rotated on use.
- Password hashing.
- Backend role and permission checks.
- Company-scoped database queries.
- Append-only audit logs enforced through MySQL triggers.

Additional financial data protection features are being developed in subsequent phases.

---

## Current Development Status

- Backend routes successfully registered and checked through the OpenAPI schema.
- Frontend production build succeeds.
- Database integration with a live MySQL instance is yet to be verified.
- Remaining modules are under development.

---

## Contributing

Suggestions, improvements and contributions are welcome.

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Submit a pull request.

---

## Repository

**GitHub:** [ATcoders/FinGuard-AI](https://github.com/ATcoders/FinGuard-AI)

**FinGuard AI — Making financial operations smarter, safer and more transparent.**