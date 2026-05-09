from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base
from datetime import datetime
import uuid

def gen_uuid():
    return str(uuid.uuid4())

class Company(Base):
    __tablename__ = "companies"
    id = Column(String, primary_key=True, default=gen_uuid)
    ico = Column(String(8), unique=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))
    employee_count = Column(Integer)
    annual_revenue_czk = Column(Float)
    regions = Column(JSON, default=list)
    categories = Column(JSON, default=list)
    telegram_chat_id = Column(String)
    notify_email = Column(Boolean, default=True)
    notify_telegram = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    saved_tenders = relationship("SavedTender", back_populates="company")
    notifications = relationship("Notification", back_populates="company")

class Tender(Base):
    __tablename__ = "tenders"
    id = Column(String, primary_key=True)
    title = Column(String(500), nullable=False)
    contracting_authority = Column(String(255))
    value_czk = Column(Float)
    deadline = Column(DateTime)
    region = Column(String(100))
    cpv_code = Column(String(20))
    cpv_name = Column(String(255))
    procedure_type = Column(String(100))
    description = Column(Text)
    url = Column(String(500))
    source = Column(String(50), default="nipez")
    fetched_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class SavedTender(Base):
    __tablename__ = "saved_tenders"
    id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.id"))
    tender_id = Column(String, ForeignKey("tenders.id"))
    ai_score = Column(Float)
    ai_analysis = Column(Text)
    status = Column(String(50), default="saved")  # saved, applied, won, lost
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="saved_tenders")
    tender = relationship("Tender")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=gen_uuid)
    company_id = Column(String, ForeignKey("companies.id"))
    tender_id = Column(String, ForeignKey("tenders.id"), nullable=True)
    type = Column(String(50))  # new_match, deadline, result
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="notifications")
    tender = relationship("Tender")
