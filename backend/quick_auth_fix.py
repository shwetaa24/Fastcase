import os
import sys
import asyncio

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings
from app.services.email_service import send_password_reset_otp_email

async def main():
    db = SessionLocal()
    target_email = "shwetajadhav2324@gmail.com"
    pwd = "lagalos@2025"

    print("=" * 60)
    print("FASTCASE AUTH & EMAIL DIAGNOSTIC / AUTO-FIX")
    print("=" * 60)

    # 1. Check & Set User
    print(f"[*] Step 1: Checking database for: {target_email}")
    user = db.query(User).filter(User.email.ilike(target_email)).first()
    if user:
        print(f"    -> User exists (ID: {user.id}, Role: {user.role}, Active: {user.is_active})")
        user.hashed_password = get_password_hash(pwd)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.is_active = True
        user.is_verified = True
        db.commit()
        print(f"    -> Password updated successfully to: {pwd}")
    else:
        print(f"    -> User was NOT in database! Creating account now...")
        new_u = User(
            email=target_email.lower(),
            full_name="Shweta Jadhav",
            hashed_password=get_password_hash(pwd),
            role="advocate",
            is_active=True,
            is_verified=True,
        )
        db.add(new_u)
        db.commit()
        print(f"    -> Created account for {target_email} with password: {pwd}")

    # 2. Check SMTP
    print(f"\n[*] Step 2: Checking SMTP Settings in backend container:")
    print(f"    SMTP Host : {settings.SMTP_HOST or '(empty)'}")
    print(f"    SMTP Port : {settings.SMTP_PORT or '(empty)'}")
    print(f"    SMTP User : {settings.SMTP_USERNAME or '(empty)'}")
    print(f"    SMTP From : {settings.SMTP_FROM_EMAIL or '(empty)'}")
    has_pwd = bool(settings.SMTP_PASSWORD and not str(settings.SMTP_PASSWORD).startswith("REPLACE_WITH"))
    print(f"    SMTP Pass : {'[CONFIGURED]' if has_pwd else '[MISSING]'}")

    if has_pwd and settings.SMTP_HOST:
        print(f"\n[*] Step 3: Sending a live OTP test email to {target_email}...")
        try:
            await send_password_reset_otp_email(
                to_email=target_email,
                otp_code="928374",
                user_name="Shweta Jadhav",
                expiry_minutes=15,
            )
            print("    -> SUCCESS: Brevo accepted and sent email! Check Inbox and Spam.")
        except Exception as e:
            print(f"    -> FAILED to send email: {e}")
    else:
        print("\n[!] SMTP credentials missing inside container.")
        print("    Run: docker compose up -d --force-recreate backend")

    print("\n" + "=" * 60)
    print("ALL DONE! You can now sign in at https://app.fastcase.in/login")
    print(f"Email   : {target_email}")
    print(f"Password: {pwd}")
    print("=" * 60)

    db.close()

if __name__ == "__main__":
    asyncio.run(main())
