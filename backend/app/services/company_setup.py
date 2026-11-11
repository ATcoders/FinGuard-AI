"""Default, fully editable configuration created for every new company."""
from sqlalchemy import text

DEFAULT_DEPARTMENTS = [
    ("Information Technology", "IT"),
    ("Human Resources", "HR"),
    ("Marketing", "MKT"),
    ("Operations", "OPS"),
    ("Finance", "FIN"),
    ("Administration", "ADM"),
]

# (name, level_rank, approval_limit in INR; None = unlimited). Illustrative, editable by admin.
DEFAULT_DESIGNATIONS = [
    ("Employee", 1, 5000),
    ("Team Lead", 2, 20000),
    ("Manager", 3, 50000),
    ("Director", 4, 200000),
    ("CFO", 5, None),
]

# (name, requires_po, po_threshold)
DEFAULT_CATEGORIES = [
    ("Travel", 0, None),
    ("Accommodation", 0, None),
    ("Food", 0, None),
    ("Software", 0, None),
    ("Equipment", 1, 25000),
    ("Office Supplies", 0, None),
    ("Marketing", 0, None),
    ("Maintenance", 0, None),
    ("Miscellaneous", 0, None),
]


def seed_company_defaults(conn, company_id: int) -> None:
    for name, code in DEFAULT_DEPARTMENTS:
        conn.execute(
            text("INSERT INTO departments (company_id, name, code) VALUES (:c, :n, :k)"),
            {"c": company_id, "n": name, "k": code},
        )
    for name, rank, limit in DEFAULT_DESIGNATIONS:
        conn.execute(
            text(
                "INSERT INTO designations (company_id, name, level_rank, approval_limit) "
                "VALUES (:c, :n, :r, :l)"
            ),
            {"c": company_id, "n": name, "r": rank, "l": limit},
        )
    for name, req_po, threshold in DEFAULT_CATEGORIES:
        conn.execute(
            text(
                "INSERT INTO expense_categories (company_id, name, requires_po, po_threshold) "
                "VALUES (:c, :n, :p, :t)"
            ),
            {"c": company_id, "n": name, "p": req_po, "t": threshold},
        )
