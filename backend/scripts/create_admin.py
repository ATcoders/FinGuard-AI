"""Create a company workspace and its first administrator from the command line.

Usage (from the backend/ folder):
    python -m scripts.create_admin --company "Acme Industries Pvt Ltd" \
        --name "Asha Verma" --email admin@acme.test
The password is prompted for, so it never lands in shell history or Git.
"""
import argparse
import getpass
import sys

from sqlalchemy import text

from app.auth.security import hash_password
from app.database.session import engine
from app.services.audit import log_audit
from app.services.company_setup import seed_company_defaults


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--company", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8 or password.isalpha() or password.isdigit():
        print("Password must be 8+ characters and mix letters with numbers or symbols.")
        return 1

    with engine.begin() as conn:
        if conn.execute(text("SELECT 1 FROM users WHERE email = :e"), {"e": args.email.lower()}).first():
            print("A user with that email already exists.")
            return 1
        row = conn.execute(text("SELECT id FROM companies WHERE name = :n"), {"n": args.company}).first()
        if row:
            company_id = row[0]
        else:
            company_id = conn.execute(text("INSERT INTO companies (name) VALUES (:n)"), {"n": args.company}).lastrowid
            seed_company_defaults(conn, company_id)
        role_id = conn.execute(text("SELECT id FROM roles WHERE code = 'admin'")).scalar_one()
        user_id = conn.execute(
            text("INSERT INTO users (company_id, role_id, full_name, email, password_hash) VALUES (:c, :r, :n, :e, :p)"),
            {"c": company_id, "r": role_id, "n": args.name, "e": args.email.lower(), "p": hash_password(password)},
        ).lastrowid
        log_audit(conn, company_id=company_id, user_id=user_id, action="user.create_admin_cli",
                  entity_type="user", entity_id=user_id, new={"email": args.email.lower(), "role": "admin"})
    print(f"Admin created for '{args.company}'.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
