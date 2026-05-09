import httpx
from sqlalchemy.orm import Session
from models import Tender, Company, Notification
from datetime import datetime
import logging

NIPEZ_BASE = "https://api.isd.nipez.cz/v2"

async def fetch_nipez_tenders(db: Session, pages: int = 5):
    """Fetch tenders from NIPEZ API and store new ones."""
    async with httpx.AsyncClient(timeout=30) as client:
        for page in range(1, pages + 1):
            try:
                resp = await client.get(
                    f"{NIPEZ_BASE}/zakazky",
                    params={"strana": page, "pocet": 50, "stavZakazky": "PROBIHAJICI"}
                )
                resp.raise_for_status()
                data = resp.json()
                items = data.get("zakazky", data.get("items", []))
                new_count = 0
                for item in items:
                    tender_id = str(item.get("id") or item.get("systemoveCislo", ""))
                    if not tender_id:
                        continue
                    existing = db.query(Tender).filter(Tender.id == tender_id).first()
                    if existing:
                        continue
                    deadline_raw = item.get("lhutaPodani") or item.get("datumUkonceni")
                    deadline = None
                    if deadline_raw:
                        try:
                            deadline = datetime.fromisoformat(deadline_raw.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    tender = Tender(
                        id=tender_id,
                        title=item.get("nazev") or item.get("predmetZakazky", "Bez názvu"),
                        contracting_authority=item.get("zadavatel", {}).get("nazev") if isinstance(item.get("zadavatel"), dict) else item.get("zadavatel", ""),
                        value_czk=item.get("predpokladanaHodnota") or item.get("cenaBezDph"),
                        deadline=deadline,
                        region=item.get("mistoPlneni") or item.get("nuts"),
                        cpv_code=item.get("cpv", {}).get("kod") if isinstance(item.get("cpv"), dict) else item.get("cpvKod"),
                        cpv_name=item.get("cpv", {}).get("nazev") if isinstance(item.get("cpv"), dict) else item.get("cpvNazev"),
                        procedure_type=item.get("druhZakazky") or item.get("druhRizeni"),
                        description=item.get("popis") or item.get("predmetZakazky"),
                        url=item.get("url") or f"https://nen.nipez.cz/profily/{tender_id}",
                        source="nipez",
                    )
                    db.add(tender)
                    new_count += 1
                db.commit()
                await _notify_matching_companies(db, new_count)
                logging.info(f"NIPEZ page {page}: {new_count} new tenders")
            except Exception as e:
                logging.error(f"NIPEZ fetch error page {page}: {e}")

async def _notify_matching_companies(db: Session, new_count: int):
    """Create notifications for companies whose profile matches new tenders."""
    if new_count == 0:
        return
    companies = db.query(Company).all()
    for company in companies:
        if not company.categories:
            continue
        for cat in company.categories:
            new_matches = db.query(Tender).filter(
                Tender.cpv_name.ilike(f"%{cat}%"),
                Tender.is_active == True
            ).order_by(Tender.fetched_at.desc()).limit(3).all()
            for tender in new_matches:
                already = db.query(Notification).filter(
                    Notification.company_id == company.id,
                    Notification.tender_id == tender.id,
                    Notification.type == "new_match"
                ).first()
                if not already:
                    notif = Notification(
                        company_id=company.id,
                        tender_id=tender.id,
                        type="new_match",
                        message=f"Nová zakázka odpovídající vašemu profilu: {tender.title}",
                    )
                    db.add(notif)
    db.commit()
