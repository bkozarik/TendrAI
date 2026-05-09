from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Notification
from routers.auth import current_company
from models import Company

router = APIRouter()

@router.get("/")
def list_notifications(
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    items = db.query(Notification).filter(
        Notification.company_id == company.id
    ).order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "id": n.id,
                "type": n.type,
                "message": n.message,
                "is_read": n.is_read,
                "tender_id": n.tender_id,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
        "unread": db.query(Notification).filter(
            Notification.company_id == company.id,
            Notification.is_read == False
        ).count()
    }

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    db.query(Notification).filter(
        Notification.company_id == company.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}
