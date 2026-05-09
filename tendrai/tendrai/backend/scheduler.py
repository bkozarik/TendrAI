"""
Run this as a separate process: python scheduler.py
Syncs NIPEZ tenders every 2 hours and checks deadlines daily.
"""
import asyncio
import logging
from database import SessionLocal
from services.nipez import fetch_nipez_tenders
from models import SavedTender, Tender, Notification
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

async def sync_job():
    logging.info("Starting NIPEZ sync...")
    db = SessionLocal()
    try:
        await fetch_nipez_tenders(db, pages=10)
        logging.info("NIPEZ sync complete")
    finally:
        db.close()

async def deadline_job():
    """Notify companies about tenders ending in 3 days."""
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() + timedelta(days=3)
        soon = db.query(SavedTender).join(Tender).filter(
            Tender.deadline <= cutoff,
            Tender.deadline >= datetime.utcnow(),
            Tender.is_active == True,
            SavedTender.status.in_(["saved", "applied"])
        ).all()
        for s in soon:
            exists = db.query(Notification).filter(
                Notification.company_id == s.company_id,
                Notification.tender_id == s.tender_id,
                Notification.type == "deadline"
            ).first()
            if not exists:
                notif = Notification(
                    company_id=s.company_id,
                    tender_id=s.tender_id,
                    type="deadline",
                    message=f"Deadline za 3 dny: {s.tender.title}"
                )
                db.add(notif)
        db.commit()
        logging.info(f"Deadline check: {len(soon)} reminders created")
    finally:
        db.close()

async def main():
    while True:
        await sync_job()
        await deadline_job()
        logging.info("Sleeping 2 hours...")
        await asyncio.sleep(7200)

if __name__ == "__main__":
    asyncio.run(main())
