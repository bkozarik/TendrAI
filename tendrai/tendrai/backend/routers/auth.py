from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import Company
from passlib.hash import bcrypt
import jwt, os, datetime

router = APIRouter()
security = HTTPBearer()
SECRET = os.getenv("JWT_SECRET", "tendrai-dev-secret-change-in-prod")

class RegisterBody(BaseModel):
    ico: str
    name: str
    email: EmailStr
    password: str
    employee_count: int = 1
    regions: list[str] = []
    categories: list[str] = []

class LoginBody(BaseModel):
    email: EmailStr
    password: str

def make_token(company_id: str) -> str:
    payload = {
        "sub": company_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")

def current_company(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Company:
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=["HS256"])
        company = db.query(Company).filter(Company.id == payload["sub"]).first()
        if not company:
            raise HTTPException(status_code=401, detail="Company not found")
        return company
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(Company).filter(Company.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Company).filter(Company.ico == body.ico).first():
        raise HTTPException(status_code=400, detail="IČO already registered")
    company = Company(
        ico=body.ico,
        name=body.name,
        email=body.email,
        password_hash=bcrypt.hash(body.password),
        employee_count=body.employee_count,
        regions=body.regions,
        categories=body.categories,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return {"token": make_token(company.id), "company": {"id": company.id, "name": company.name}}

@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.email == body.email).first()
    if not company or not bcrypt.verify(body.password, company.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": make_token(company.id), "company": {"id": company.id, "name": company.name}}

@router.get("/me")
def me(company: Company = Depends(current_company)):
    return {
        "id": company.id,
        "ico": company.ico,
        "name": company.name,
        "email": company.email,
        "employee_count": company.employee_count,
        "regions": company.regions,
        "categories": company.categories,
        "notify_email": company.notify_email,
        "notify_telegram": company.notify_telegram,
    }
