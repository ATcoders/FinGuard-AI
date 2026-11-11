from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.auth.deps import require_roles
from app.auth.security import hash_password
from app.database.session import get_db
from app.schemas.common import UserCreate, UserUpdate
from app.services.audit import log_audit

router = APIRouter(prefix="/api/users", tags=["users"])

admin_only = require_roles("admin")
can_view = require_roles("admin", "finance", "director", "cfo")


def _check_company_refs(conn, company_id: int, department_id, designation_id, manager_id):
    """Every referenced record must belong to the caller's company (tenant isolation)."""
    checks = [
        ("departments", department_id, "Department"),
        ("designations", designation_id, "Designation"),
        ("users", manager_id, "Manager"),
    ]
    for table, value, label in checks:
        if value is None:
            continue
        ok = conn.execute(
            text(f"SELECT 1 FROM {table} WHERE id = :i AND company_id = :c"),  # table names are constants above
            {"i": value, "c": company_id},
        ).first()
        if not ok:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{label} not found in your company")


def _set_manager(conn, company_id: int, employee_id: int, manager_id: int | None):
    conn.execute(text("DELETE FROM employee_hierarchy WHERE employee_id = :e"), {"e": employee_id})
    if manager_id is not None:
        if manager_id == employee_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A person cannot report to themselves")
        conn.execute(
            text("INSERT INTO employee_hierarchy (company_id, employee_id, manager_id) VALUES (:c, :e, :m)"),
            {"c": company_id, "e": employee_id, "m": manager_id},
        )


@router.get("")
def list_users(user=Depends(can_view), conn=Depends(get_db)):
    rows = conn.execute(
        text(
            """
            SELECT u.id, u.full_name, u.email, u.employee_code, u.is_active, u.last_login_at,
                   r.code AS role, r.name AS role_name,
                   u.department_id, d.name AS department_name,
                   u.designation_id, g.name AS designation_name, g.approval_limit,
                   eh.manager_id, m.full_name AS manager_name
            FROM users u
            JOIN roles r ON r.id = u.role_id
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN designations g ON g.id = u.designation_id
            LEFT JOIN employee_hierarchy eh ON eh.employee_id = u.id
            LEFT JOIN users m ON m.id = eh.manager_id
            WHERE u.company_id = :c
            ORDER BY u.full_name
            """
        ),
        {"c": user["company_id"]},
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("", status_code=201)
def create_user(body: UserCreate, user=Depends(admin_only), conn=Depends(get_db)):
    _check_company_refs(conn, user["company_id"], body.department_id, body.designation_id, body.manager_id)
    role_id = conn.execute(text("SELECT id FROM roles WHERE code = :c"), {"c": body.role}).scalar_one()
    try:
        new_id = conn.execute(
            text(
                """
                INSERT INTO users (company_id, department_id, designation_id, role_id,
                                   employee_code, full_name, email, password_hash)
                VALUES (:c, :d, :g, :r, :code, :n, :e, :p)
                """
            ),
            {"c": user["company_id"], "d": body.department_id, "g": body.designation_id, "r": role_id,
             "code": body.employee_code or None, "n": body.full_name.strip(),
             "e": body.email.lower(), "p": hash_password(body.password)},
        ).lastrowid
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or employee code is already in use")
    _set_manager(conn, user["company_id"], new_id, body.manager_id)
    log_audit(
        conn, company_id=user["company_id"], user_id=user["id"], action="user.create",
        entity_type="user", entity_id=new_id,
        new={"email": body.email.lower(), "role": body.role, "department_id": body.department_id,
             "designation_id": body.designation_id},
    )
    return {"id": new_id}


@router.patch("/{user_id}")
def update_user(user_id: int, body: UserUpdate, user=Depends(admin_only), conn=Depends(get_db)):
    target = conn.execute(
        text(
            """
            SELECT u.id, u.full_name, u.is_active, u.department_id, u.designation_id,
                   u.employee_code, r.code AS role
            FROM users u JOIN roles r ON r.id = u.role_id
            WHERE u.id = :i AND u.company_id = :c
            """
        ),
        {"i": user_id, "c": user["company_id"]},
    ).mappings().first()
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    data = body.model_dump(exclude_unset=True)

    if user_id == user["id"]:
        if data.get("is_active") is False:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "You cannot deactivate your own account")
        if "role" in data and data["role"] != "admin":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "You cannot remove your own admin role")

    _check_company_refs(conn, user["company_id"], data.get("department_id"), data.get("designation_id"), data.get("manager_id"))

    sets, params = [], {"i": user_id, "c": user["company_id"]}
    if "full_name" in data:
        sets.append("full_name = :full_name"); params["full_name"] = data["full_name"].strip()
    if "employee_code" in data:
        sets.append("employee_code = :employee_code"); params["employee_code"] = data["employee_code"] or None
    if "department_id" in data:
        sets.append("department_id = :department_id"); params["department_id"] = data["department_id"]
    if "designation_id" in data:
        sets.append("designation_id = :designation_id"); params["designation_id"] = data["designation_id"]
    if "is_active" in data:
        sets.append("is_active = :is_active"); params["is_active"] = int(data["is_active"])
    if "role" in data:
        sets.append("role_id = (SELECT id FROM roles WHERE code = :role)"); params["role"] = data["role"]
    if data.get("new_password"):
        sets.append("password_hash = :ph"); params["ph"] = hash_password(data["new_password"])

    if sets:
        try:
            conn.execute(text(f"UPDATE users SET {', '.join(sets)} WHERE id = :i AND company_id = :c"), params)
        except IntegrityError:
            raise HTTPException(status.HTTP_409_CONFLICT, "Employee code is already in use")
    if "manager_id" in data:
        _set_manager(conn, user["company_id"], user_id, data["manager_id"])
    if data.get("is_active") is False:
        conn.execute(text("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE user_id = :u AND revoked_at IS NULL"), {"u": user_id})

    changed = {k: v for k, v in data.items() if k != "new_password"}
    if data.get("new_password"):
        changed["password"] = "reset"
    log_audit(
        conn, company_id=user["company_id"], user_id=user["id"], action="user.update",
        entity_type="user", entity_id=user_id,
        previous={k: target.get(k) for k in ("role", "is_active", "department_id", "designation_id") if k in data},
        new=changed,
    )
    return {"ok": True}
