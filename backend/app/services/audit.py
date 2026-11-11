import json
from typing import Any

from sqlalchemy import text


def log_audit(
    conn,
    *,
    company_id: int | None,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    previous: dict[str, Any] | None = None,
    new: dict[str, Any] | None = None,
    reason: str | None = None,
    ip: str | None = None,
) -> None:
    """Append one audit record. Never pass passwords, tokens or full bank numbers."""
    conn.execute(
        text(
            """
            INSERT INTO audit_logs
              (company_id, user_id, action, entity_type, entity_id,
               previous_value, new_value, reason, ip_address)
            VALUES (:cid, :uid, :action, :etype, :eid, :prev, :new, :reason, :ip)
            """
        ),
        {
            "cid": company_id,
            "uid": user_id,
            "action": action,
            "etype": entity_type,
            "eid": entity_id,
            "prev": json.dumps(previous, default=str) if previous is not None else None,
            "new": json.dumps(new, default=str) if new is not None else None,
            "reason": reason,
            "ip": ip,
        },
    )
