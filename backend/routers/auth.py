import os
import uuid
import json
import time
import hmac
import hashlib
import secrets
import base64
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.shared.models import UserModel
from backend.routers.evidence import _in_memory_users

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY", "skilltwin-secure-production-jwt-key-2026")

# In-memory authentication store fallback: normalized_email -> auth_record
_in_memory_auth_users: Dict[str, Dict[str, Any]] = {}


# =========================================================
# Cryptographic Password & Token Helpers (Standard Library)
# =========================================================

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with cryptographic salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100_000
    )
    return f"{salt}:{key.hex()}"


def verify_password(password: str, stored_hash: Optional[str]) -> bool:
    """Safely verify raw password against stored PBKDF2 hash."""
    if not stored_hash or ":" not in stored_hash:
        return False
    try:
        salt, key = stored_hash.split(":", 1)
        computed = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100_000
        )
        return secrets.compare_digest(computed.hex(), key)
    except Exception:
        return False


def create_access_token(user_id: str, email: str, name: str, expires_in_seconds: int = 86400 * 30) -> str:
    """Create tamper-proof signed bearer token valid for 30 days."""
    payload = {
        "sub": user_id,
        "email": email.strip().lower(),
        "name": name,
        "exp": int(time.time()) + expires_in_seconds
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip("=")
    sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode('utf-8').rstrip("=")
    return f"{payload_b64}.{sig_b64}"


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify cryptographic signature and expiry of bearer token."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8').rstrip("=")
        if not secrets.compare_digest(sig_b64, expected_sig_b64):
            return None

        # Add base64 padding if necessary
        padding = 4 - (len(payload_b64) % 4)
        if padding and padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


# =========================================================
# Request & Response Contracts
# =========================================================

class SignUpRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(...)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(...)
    password: str = Field(..., min_length=1)


class UserProfileContract(BaseModel):
    id: str
    name: str
    email: str
    education_level: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    semester_year: Optional[str] = None
    target_role: Optional[str] = None
    study_time_per_day: Optional[str] = None
    preferred_learning_style: Optional[str] = None
    preferred_language: Optional[str] = "English"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    status: str = "success"
    token: str
    user: UserProfileContract
    message: str


# =========================================================
# API Endpoints
# =========================================================

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    """Register a new student account with encrypted credentials."""
    clean_name = payload.name.strip()
    clean_email = payload.email.strip().lower()

    if not clean_email or "@" not in clean_email or "." not in clean_email:
        raise HTTPException(status_code=400, detail="Invalid email address format.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    pw_hash = hash_password(payload.password)
    user_id = str(uuid.uuid4())
    now = datetime.utcnow()

    user_obj: Optional[UserModel] = None
    try:
        existing_user = db.query(UserModel).filter(UserModel.email.ilike(clean_email)).first()
        if existing_user:
            if existing_user.password_hash:
                raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")
            # If user previously did guest onboarding without password, attach password now
            existing_user.password_hash = pw_hash
            existing_user.name = clean_name
            existing_user.updated_at = now
            db.commit()
            db.refresh(existing_user)
            user_obj = existing_user
        else:
            new_user = UserModel(
                id=uuid.UUID(user_id),
                name=clean_name,
                email=clean_email,
                password_hash=pw_hash,
                created_at=now,
                updated_at=now
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user_obj = new_user
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Auth Notice] DB signup fallback to in-memory: {e}")

    # Fallback to in-memory store if DB query failed
    if clean_email in _in_memory_auth_users and _in_memory_auth_users[clean_email].get("password_hash"):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")

    profile_dict = {
        "id": str(user_obj.id) if user_obj else user_id,
        "name": user_obj.name if user_obj else clean_name,
        "email": user_obj.email if user_obj else clean_email,
        "education_level": user_obj.education_level if user_obj else None,
        "degree": user_obj.degree if user_obj else None,
        "branch": user_obj.branch if user_obj else None,
        "semester_year": user_obj.semester_year if user_obj else None,
        "target_role": user_obj.target_role if user_obj else None,
        "study_time_per_day": user_obj.study_time_per_day if user_obj else None,
        "preferred_learning_style": user_obj.preferred_learning_style if user_obj else None,
        "preferred_language": user_obj.preferred_language if user_obj else "English",
        "created_at": user_obj.created_at if user_obj else now,
        "updated_at": user_obj.updated_at if user_obj else now,
        "password_hash": pw_hash
    }

    _in_memory_auth_users[clean_email] = profile_dict
    _in_memory_auth_users[profile_dict["id"]] = profile_dict
    _in_memory_users[clean_email] = profile_dict
    _in_memory_users[profile_dict["id"]] = profile_dict

    token = create_access_token(profile_dict["id"], clean_email, clean_name)
    user_contract = UserProfileContract(**{k: v for k, v in profile_dict.items() if k != "password_hash"})

    return AuthResponse(
        status="success",
        token=token,
        user=user_contract,
        message="Account created successfully."
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate student with email and password."""
    clean_email = payload.email.strip().lower()
    clean_password = payload.password

    matched_user: Optional[Dict[str, Any]] = None

    # Try database first
    try:
        db_user = db.query(UserModel).filter(UserModel.email.ilike(clean_email)).first()
        if db_user and db_user.password_hash:
            if verify_password(clean_password, db_user.password_hash):
                matched_user = {
                    "id": str(db_user.id),
                    "name": db_user.name,
                    "email": db_user.email,
                    "education_level": db_user.education_level,
                    "degree": db_user.degree,
                    "branch": db_user.branch,
                    "semester_year": db_user.semester_year,
                    "target_role": db_user.target_role,
                    "study_time_per_day": db_user.study_time_per_day,
                    "preferred_learning_style": db_user.preferred_learning_style,
                    "preferred_language": db_user.preferred_language or "English",
                    "created_at": db_user.created_at,
                    "updated_at": db_user.updated_at
                }
    except Exception as e:
        print(f"[Auth Notice] DB login check fallback: {e}")

    # Fallback to in-memory store
    if not matched_user and clean_email in _in_memory_auth_users:
        cached = _in_memory_auth_users[clean_email]
        if verify_password(clean_password, cached.get("password_hash")):
            matched_user = {k: v for k, v in cached.items() if k != "password_hash"}

    if not matched_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )

    token = create_access_token(matched_user["id"], matched_user["email"], matched_user["name"])
    user_contract = UserProfileContract(**matched_user)

    return AuthResponse(
        status="success",
        token=token,
        user=user_contract,
        message="Logged in successfully."
    )


@router.get("/me", response_model=UserProfileContract)
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Retrieve currently authenticated user profile from token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authentication token.")

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid. Please log in again.")

    user_id = payload.get("sub")
    email = payload.get("email")

    try:
        db_user = db.query(UserModel).filter(UserModel.id == uuid.UUID(user_id)).first()
        if db_user:
            return UserProfileContract(
                id=str(db_user.id),
                name=db_user.name,
                email=db_user.email,
                education_level=db_user.education_level,
                degree=db_user.degree,
                branch=db_user.branch,
                semester_year=db_user.semester_year,
                target_role=db_user.target_role,
                study_time_per_day=db_user.study_time_per_day,
                preferred_learning_style=db_user.preferred_learning_style,
                preferred_language=db_user.preferred_language or "English",
                created_at=db_user.created_at,
                updated_at=db_user.updated_at
            )
    except Exception:
        pass

    if email in _in_memory_auth_users:
        cached = _in_memory_auth_users[email]
        return UserProfileContract(**{k: v for k, v in cached.items() if k != "password_hash"})

    return UserProfileContract(
        id=user_id,
        name=payload.get("name", "Student"),
        email=email,
        created_at=datetime.utcnow()
    )


@router.post("/logout")
def logout():
    """Client-side token invalidation confirmation."""
    return {"status": "success", "message": "Logged out successfully."}
