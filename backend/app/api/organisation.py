"""Departments, designations, roles and expense categories (company-scoped)."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.auth.deps import get_current_user, require_roles
from app.database.session import get_db
from app.schemas.common import DepartmentIn, DesignationIn
from app.services.audit import log_audit

router = APIRouter(prefix="/api", tags=["organisation"])

admin_only = require_roles("admin")


# ---------------- Roles / categories (read-only reference) ----------------
@router.get("/roles")
def list_roles(user=Depends(get_current_user), conn=Depends(get_db)):
    rows = conn.execute(text("SELECT code, name, description FROM roles ORDER BY id")).mappings().all()
    return [dict(r) for r in rows]


@router.get("/categories")
def list_categories(user=Depends(get_current_user), conn=Depends(get_db)):
    rows = conn.execute(
        text("SELECT id, name, requires_po, po_threshold FROM expense_categories WHERE company_id = :c AND is_active = 1 ORDER BY name"),
        {"c": user["company_id"]},
    ).mappings().all()
    return [dict(r) for r in rows]


# ---------------- Departments ----------------
@router.get("/departments")
def list_departments(user=Depends(get_current_user), conn=Depends(get_db)):
    rows = conn.execute(
        text(
            """
            SELECT d.id, d.name, d.code, d.monthly_budget, d.spending_limit, d.is_active,
                   (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) AS member_count
            FROM departments d WHERE d.company_id = :c ORDER BY d.name
            """
        ),
        {"c": user["company_id"]},
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("/departments", status_code=201)
def create_department(body: DepartmentIn, request: Request, user=Depends(admin_only), conn=Depends(get_db)):
    try:
        new_id = conn.execute(
            text(
                """
                INSERT INTO departments (company_id, name, code, monthly_budget, spending_limit, is_active)
                VALUES (:c, :n, :k, :b, :l, :a)
                """
            ),
            {"c": user["company_id"], "n": body.name.strip(), "k": body.code.strip().upper(),
             "b": body.monthly_budget, "l": body.spending_limit, "a": body.is_active},
        ).lastrowid
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "A department with this name or code already exists")
    log_audit(conn, company_id=user["company_id"], user_id=user["id"], action="department.create",
              entity_type="department", entity_id=new_id, new=body.model_dump(mode="json"))
    return {"id": new_id}


@router.put("/departments/{dept_id}")
def update_department(dept_id: int, body: DepartmentIn, user=Depends(admin_only), conn=Depends(get_db)):
    old = conn.execute(
        text("SELECT name, code, monthly_budget, spending_limit, is_active FROM departments WHERE id = :i AND company_id = :c"),
        {"i": dept_id, "c": user["company_id"]},
    ).mappings().first()
    if not old:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    try:
        conn.execute(
            text(
                """
                UPDATE departments SET name = :n, code = :k, monthly_budget = :b,
                       spending_limit = :l, is_active = :a
                WHERE id = :i AND company_id = :c
                """
            ),
            {"n": body.name.strip(), "k": body.code.strip().upper(), "b": body.monthly_budget,
             "l": body.spending_limit, "a": body.is_active, "i": dept_id, "c": user["company_id"]},
        )
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "A department with this name or code already exists")
    log_audit(conn, company_id=user["company_id"], user_id=user["id"], action="department.update",
              entity_type="department", entity_id=dept_id, previous=dict(old), new=body.model_dump(mode="json"))
    return {"ok": True}


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(dept_id: int, user=Depends(admin_only), conn=Depends(get_db)):
    dept = conn.execute(
        text("SELECT name FROM departments WHERE id = :i AND company_id = :c"),
        {"i": dept_id, "c": user["company_id"]},
    ).mappings().first()
    if not dept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    in_use = conn.execute(
        text(
            "SELECT (SELECT COUNT(*) FROM users WHERE department_id = :i) + "
            "(SELECT COUNT(*) FROM invoices WHERE department_id = :i)"
        ),
        {"i": dept_id},
    ).scalar_one()
    if in_use:
        raise HTTPException(status.HTTP_409_CONFLICT, "Department has employees or invoices. Deactivate it instead of deleting.")
    conn.execute(text("DELETE FROM departments WHERE id = :i"), {"i": dept_id})
    log_audit(conn, company_id=user["company_id"], user_id=user["id"], action="department.delete",
              entity_type="department", entity_id=dept_id, previous={"name": dept["name"]})


# ---------------- Designations ----------------
@router.get("/designations")
def list_designations(user=Depends(get_current_user), conn=Depends(get_db)):
    rows = conn.execute(
        text(
            """
            SELECT g.id, g.name, g.level_rank, g.approval_limit,
                   (SELECT COUNT(*) FROM users u WHERE u.designation_id = g.id) AS member_count
            FROM designations g WHERE g.company_id = :c ORDER BY g.level_rank
            """
        ),
        {"c": user["company_id"]},
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("/designations", status_code=201)
def create_designation(body: DesignationIn, user=Depends(admin_only), conn=Depends(get_db)):
    try:
        new_id = conn.execute(
            text("INSERT INTO designations (company_id, name, level_rank, approval_limit) VALUES (:c, :n, :r, :l)"),
            {"c": user["company_id"], "n": body.name.strip(), "r": body.level_rank, "l": body.approval_limit},
        ).lastrowid
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "A designation with this name already exists")
    log_audit(conn, company_id=user["company_id"], user_id=user["id"], action="designation.create",
              entity_type="designation", entity_id=new_id, new=body.model_dump(mode="json"))
    return {"id": new_id}


@router.put("/designations/{desig_id}")
def update_designation(desig_id: int, body: DesignationIn, user=Depends(admin_only), conn=Depends(get_db)):
    old = conn.execute(
        text("SELECT name, level_rank, approval_limit FROM designations WHERE id = :i AND company_id = :c"),
        {"i": desig_id, "c": user["company_id"]},
    ).mappings().first()
    if not old:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Designation not found")
    try:
        conn.execute(
            text("UPDATE designations SET name = :n, level_rank = :r, approval_limit = :l WHERE id = :i AND company_id = :c"),
            {"n": body.name.strip(), "r": body.level_rank, "l": body.approval_limit, "i": desig_id, "c": user["company_id"]},
        )
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "A designation with this name already exists")
    log_audit(conn, company_id=user["company_id"], user_id=user["id"], action="designation.update",
              entity_type="designation", entity_id=desig_id, previous=dict(old), new=body.model_dump(mode="json"),
              reason="Approval limits changed" if old["approval_limit"] != body.approval_limit else None)
    return {"ok": True}
