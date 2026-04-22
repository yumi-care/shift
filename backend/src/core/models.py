"""
Phase 1 で使うテーブル定義

マルチテナント対応：corp_id で企業を分離
"""

from sqlalchemy import Column, Integer, String, DateTime, Time, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Corporation(Base):
    """法人（会社全体）"""
    __tablename__ = "corporations"

    corp_id = Column(Integer, primary_key=True)
    corp_name = Column(String(255), nullable=False)
    corp_number = Column(String(13), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Facility(Base):
    """事業所（施設）"""
    __tablename__ = "facilities"

    facility_id = Column(Integer, primary_key=True)
    corp_id = Column(Integer, ForeignKey("corporations.corp_id"), nullable=False)  # ⚠️ IMMUTABLE: マルチテナント分離
    facility_name = Column(String(255), nullable=False)
    department = Column(String(50), nullable=False)  # welfare or care
    service_type = Column(String(100), nullable=False)
    capacity = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Location(Base):
    """拠点（棟・ユニット）"""
    __tablename__ = "locations"

    location_id = Column(Integer, primary_key=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id"), nullable=False)
    location_name = Column(String(255), nullable=False)
    address = Column(String(255))
    business_hours_start = Column(Time)  # 08:00
    business_hours_end = Column(Time)    # 18:00
    staff_capacity = Column(Integer)     # 職員の人数枠
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
