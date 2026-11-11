from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.auth.deps import get_current_user
from app.auth.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token,
    verify_password,
)
from app.config import settings
from app.database.session import get_db
from app.schemas.common import LoginIn, RegisterIn
from app.services.audit import log_audit
from app.services.company_setup import seed_company_defaults

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE = "fg_refresh"


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _user_payload(conn, user_id: int) -> dict:
    row = conn.execute(
        text(
            """
            SELECT u.id, u.company_id, c.name AS company_name, u.full_name, u.email,
                   r.code AS role, u.department_id, d.name AS department_name,
                   u.designation_id, g.name AS designation_name, g.approval_limit
            FROM users u
            JOIN roles r ON r.id = u.role_id
            JOIN companies c ON c.id = u.company_id
            LEFT JOIN departments d ON d.id = u.department_id
            LEFT JOIN designations g ON g.id = u.designation_id
            WHERE u.id = :uid
            """
        ),
        {"uid": user_id},
    ).mappings().first()
    return dict(row)


def _start_session(conn, response: Response, user_id: int) -> dict:
    user = _user_payload(conn, user_id)
    raw, token_hash, expires = new_refresh_token()
    conn.execute(
        text("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:u, :h, :e)"),
        {"u": user_id, "h": token_hash, "e": expires},
    )
    response.set_cookie(
        REFRESH_COOKIE,
        raw,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/auth",
    )
    return {
        "access_token": create_access_token(user["id"], user["company_id"], user["role"]),
        "user": user,
    }


@router.post("/register", status_code=201)
def register(body: RegisterIn, request: Request, response: Response, conn=Depends(get_db)):
    """Creates a new company workspace together with its first administrator."""
    email = body.email.lower()
    if conn.execute(text("SELECT 1 FROM users WHERE email = :e"), {"e": email}).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    try:
        company_id = conn.execute(
            text("INSERT INTO companies (name) VALUES (:n)"), {"n": body.company_name.strip()}
        ).lastrowid
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "A company with this name is already registered")

    seed_company_defaults(conn, company_id)
    role_id = conn.execute(text("SELECT id FROM roles WHERE code = 'admin'")).scalar_one()
    user_id = conn.execute(
        text(
            """
            INSERT INTO users (company_id, role_id, full_name, email, password_hash)
            VALUES (:c, :r, :n, :e, :p)
            """
        ),
        {"c": company_id, "r": role_id, "n": body.full_name.strip(), "e": email, "p": hash_password(body.password)},
    ).lastrowid
    log_audit(
        conn, company_id=company_id, user_id=user_id, action="company.register",
        entity_type="company", entity_id=company_id, new={"name": body.company_name}, ip=_client_ip(request),
    )
    return _start_session(conn, response, user_id)


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, conn=Depends(get_db)):
    row = conn.execute(
        text("SELECT id, company_id, password_hash, is_active FROM users WHERE email = :e"),
        {"e": body.email.lower()},
    ).mappings().first()

    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not row["is_active"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated")

    conn.execute(text("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = :u"), {"u": row["id"]})
    log_audit(
        conn, company_id=row["company_id"], user_id=row["id"], action="auth.login",
        entity_type="user", entity_id=row["id"], ip=_client_ip(request),
    )
    return _start_session(conn, response, row["id"])


@router.post("/refresh")
def refresh(response: Response, fg_refresh: str | None = Cookie(default=None), conn=Depends(get_db)):
    """Rotates the refresh token and returns a new short-lived access token."""
    if not fg_refresh:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No session")
    token_hash = hash_refresh_token(fg_refresh)
    row = conn.execute(
        text(
            """
            SELECT rt.id, rt.user_id, u.is_active
            FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = :h AND rt.revoked_at IS NULL AND rt.expires_at > UTC_TIMESTAMP()
            """
        ),
        {"h": token_hash},
    ).mappings().first()
    if not row or not row["is_active"]:
        response.delete_cookie(REFRESH_COOKIE, path="/api/auth")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")

    conn.execute(text("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = :i"), {"i": row["id"]})
    return _start_session(conn, response, row["user_id"])


@router.post("/logout", status_code=204)
def logout(response: Response, fg_refresh: str | None = Cookie(default=None), conn=Depends(get_db)):
    if fg_refresh:
        conn.execute(
            text("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = :h AND revoked_at IS NULL"),
            {"h": hash_refresh_token(fg_refresh)},
        )
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth")


@router.get("/me")
def me(user=Depends(get_current_user), conn=Depends(get_db)):
    return _user_payload(conn, user["id"])
