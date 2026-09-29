"""Local operator command: python -m app.create_admin (never exposed over HTTP)."""
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from pydantic import ValidationError

from app.auth.security import hash_password
from app.database import SessionLocal
from app.models.user import ROLE_ADMIN, User
from app.schemas.user import RegisterIn


def create_admin(db, name, email, password):
    # Reuse public credential validation, but assign the role only here.
    if len(password) < 12 or len(password.encode("utf-8")) > 72:
        raise ValueError("Admin password must have at least 12 characters and at most 72 UTF-8 bytes")
    credentials = RegisterIn(name=name, email=email, password=password, role="customer")
    email = str(credentials.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise ValueError("Email already exists; this command never promotes or overwrites an account")
    user = User(name=credentials.name, email=email, password_hash=hash_password(password), role=ROLE_ADMIN)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Account could not be created; verify the email and run alembic upgrade head") from None
    return user


def main():
    name = input("Admin name: ").strip()
    email = input("Admin email: ").strip()
    password = getpass("Password (12+ characters, maximum 72 bytes): ")
    if password != getpass("Confirm password: "):
        raise SystemExit("Passwords do not match")
    try:
        with SessionLocal() as db:
            create_admin(db, name, email, password)
    except ValidationError:
        raise SystemExit("Invalid name or email; please check the account details") from None
    except SQLAlchemyError:
        raise SystemExit("Database operation failed; check the connection and run alembic upgrade head") from None
    except ValueError as exc:
        raise SystemExit(str(exc)) from None
    print("Admin created. Sign in through the application's normal login screen.")


if __name__ == "__main__":
    main()
