import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text

from app.auth.security import decode_access_token
from app.database.session import get_db

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    conn=Depends(get_db),
) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_access_token(creds.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired or invalid")

    row = conn.execute(
        text(
            """
            SELECT u.id, u.company_id, u.full_name, u.email, u.department_id,
                   u.designation_id, u.is_active, r.code AS role
            FROM users u JOIN roles r ON r.id = u.role_id
            WHERE u.id = :uid
            """
        ),
        {"uid": int(payload["sub"])},
    ).mappings().first()

    if not row or not row["is_active"]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not available")
    return dict(row)


def require_roles(*allowed: str):
    """Backend role gate. The database role is authoritative, not the token claim."""

    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission for this action")
        return user

    return checker
