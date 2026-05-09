from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Company, Notification
from routers.auth import current_company
from pydantic import BaseModel
from typing import Optional, List
from passlib.hash import bcrypt

router = APIRouter()

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    employee_count: Optional[int] = None
    annual_revenue_czk: Optional[float] = None
    regions: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    notify_email: Optional[bool] = None
    notify_telegram: Optional[bool] = None
    telegram_chat_id: Optional[str] = None

@router.put("/profile")
def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    for field, value in body.dict(exclude_none=True).items():
        setattr(company, field, value)
    db.commit()
    return {"ok": True}
