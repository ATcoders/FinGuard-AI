from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.auth.deps import get_current_user
from app.database.session import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Roles that see company-wide figures; everyone else sees only their own submissions.
COMPANY_WIDE = {"admin", "finance", "director", "cfo"}


@router.get("/summary")
def summary(user=Depends(get_current_user), conn=Depends(get_db)):
    cid = user["company_id"]
    wide = user["role"] in COMPANY_WIDE
    scope_sql = "" if wide else " AND submitted_by = :uid"
    p = {"c": cid, "uid": user["id"]}

    totals = conn.execute(
        text(
            f"""
            SELECT COUNT(*) AS invoices,
                   COALESCE(SUM(total_amount), 0) AS invoice_value,
                   COALESCE(SUM(status = 'pending_approval'), 0) AS pending_approval,
                   COALESCE(SUM(status = 'approved' OR status = 'payment_ready' OR status = 'paid'), 0) AS approved,
                   COALESCE(SUM(status = 'rejected'), 0) AS rejected,
                   COALESCE(SUM(CASE WHEN status IN ('under_investigation') THEN total_amount END), 0) AS amount_on_hold
            FROM invoices WHERE company_id = :c {scope_sql}
            """
        ),
        p,
    ).mappings().one()

    monthly = conn.execute(
        text(
            f"""
            SELECT DATE_FORMAT(invoice_date, '%Y-%m') AS month, SUM(total_amount) AS amount, COUNT(*) AS count
            FROM invoices
            WHERE company_id = :c AND invoice_date IS NOT NULL
              AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) {scope_sql}
            GROUP BY month ORDER BY month
            """
        ),
        p,
    ).mappings().all()

    by_status = conn.execute(
        text(f"SELECT status, COUNT(*) AS count FROM invoices WHERE company_id = :c {scope_sql} GROUP BY status"),
        p,
    ).mappings().all()

    org = None
    if wide:
        org = conn.execute(
            text(
                """
                SELECT (SELECT COUNT(*) FROM users WHERE company_id = :c AND is_active = 1) AS employees,
                       (SELECT COUNT(*) FROM departments WHERE company_id = :c AND is_active = 1) AS departments,
                       (SELECT COUNT(*) FROM vendors WHERE company_id = :c) AS vendors
                """
            ),
            p,
        ).mappings().one()

    return {
        "scope": "company" if wide else "personal",
        "totals": dict(totals),
        "monthly": [dict(r) for r in monthly],
        "by_status": [dict(r) for r in by_status],
        "organisation": dict(org) if org else None,
    }
