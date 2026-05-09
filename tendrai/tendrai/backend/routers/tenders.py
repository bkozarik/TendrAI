from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Tender, SavedTender, Company, Notification
from routers.auth import current_company
from services.nipez import fetch_nipez_tenders
from services.ai_scorer import score_tender
from typing import Optional
from datetime import datetime

router = APIRouter()

@router.get("/")
def list_tenders(
    q: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = None,
    max_value: Optional[float] = None,
    scored: bool = True,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    query = db.query(Tender).filter(Tender.is_active == True)
    if q:
        query = query.filter(Tender.title.ilike(f"%{q}%"))
    if region:
        query = query.filter(Tender.region == region)
    if category:
        query = query.filter(Tender.cpv_name.ilike(f"%{category}%"))
    if max_value:
        query = query.filter(Tender.value_czk <= max_value)
    tenders = query.order_by(Tender.fetched_at.desc()).offset(skip).limit(limit).all()

    result = []
    for t in tenders:
        saved = db.query(SavedTender).filter(
            SavedTender.tender_id == t.id,
            SavedTender.company_id == company.id
        ).first()
        ai_score = saved.ai_score if saved else None
        result.append({
            "id": t.id,
            "title": t.title,
            "contracting_authority": t.contracting_authority,
            "value_czk": t.value_czk,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "region": t.region,
            "cpv_code": t.cpv_code,
            "cpv_name": t.cpv_name,
            "procedure_type": t.procedure_type,
            "url": t.url,
            "ai_score": ai_score,
            "status": saved.status if saved else None,
            "is_saved": saved is not None,
        })
    return {"items": result, "total": query.count()}

@router.get("/{tender_id}")
def get_tender(
    tender_id: str,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        return {"error": "Not found"}
    saved = db.query(SavedTender).filter(
        SavedTender.tender_id == tender_id,
        SavedTender.company_id == company.id
    ).first()
    return {
        "tender": {
            "id": tender.id, "title": tender.title,
            "contracting_authority": tender.contracting_authority,
            "value_czk": tender.value_czk,
            "deadline": tender.deadline.isoformat() if tender.deadline else None,
            "region": tender.region, "cpv_code": tender.cpv_code,
            "cpv_name": tender.cpv_name, "procedure_type": tender.procedure_type,
            "description": tender.description, "url": tender.url,
        },
        "ai_score": saved.ai_score if saved else None,
        "ai_analysis": saved.ai_analysis if saved else None,
        "status": saved.status if saved else None,
        "is_saved": saved is not None,
    }

@router.post("/{tender_id}/analyze")
async def analyze_tender(
    tender_id: str,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        return {"error": "Not found"}
    result = await score_tender(tender, company)
    saved = db.query(SavedTender).filter(
        SavedTender.tender_id == tender_id,
        SavedTender.company_id == company.id
    ).first()
    if not saved:
        saved = SavedTender(company_id=company.id, tender_id=tender_id)
        db.add(saved)
    saved.ai_score = result["score"]
    saved.ai_analysis = result["analysis"]
    db.commit()
    return result

@router.post("/{tender_id}/save")
def save_tender(
    tender_id: str,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    existing = db.query(SavedTender).filter(
        SavedTender.tender_id == tender_id,
        SavedTender.company_id == company.id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"saved": False}
    saved = SavedTender(company_id=company.id, tender_id=tender_id, status="saved")
    db.add(saved)
    db.commit()
    return {"saved": True}

@router.post("/{tender_id}/status")
def update_status(
    tender_id: str,
    status: str,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    saved = db.query(SavedTender).filter(
        SavedTender.tender_id == tender_id,
        SavedTender.company_id == company.id
    ).first()
    if saved:
        saved.status = status
        db.commit()
    return {"status": status}

@router.post("/sync")
async def sync_tenders(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    company: Company = Depends(current_company)
):
    background_tasks.add_task(fetch_nipez_tenders, db)
    return {"message": "Sync started in background"}
