"""
Phase 2：ビジネスロジック

スタッフ登録のデータベース処理
"""

from sqlalchemy.orm import Session
from sqlalchemy.sql import and_
from src.core.models import Corporation, Facility, Location, Staff
from src.phase2 import schemas


# ============ 法人の処理 ============

def get_corporations(db: Session) -> list[Corporation]:
    """すべての法人を取得"""
    return db.query(Corporation).all()


def get_corporation_by_id(db: Session, corp_id: int) -> Corporation:
    """指定された法人を取得"""
    return db.query(Corporation).filter(Corporation.corp_id == corp_id).first()


# ============ 事業所の処理 ============

def get_facilities_by_corp(db: Session, corp_id: int) -> list[Facility]:
    """指定された法人の事業所をすべて取得"""
    # ⚠️ IMMUTABLE: マルチテナント分離 - corp_id で所属を確認
    return db.query(Facility).filter(Facility.corp_id == corp_id).all()


def get_facility_by_id(db: Session, facility_id: int) -> Facility:
    """指定された事業所を取得"""
    return db.query(Facility).filter(Facility.facility_id == facility_id).first()


# ============ 拠点の処理 ============

def get_locations_by_facility(db: Session, facility_id: int) -> list[Location]:
    """指定された事業所の拠点をすべて取得"""
    return db.query(Location).filter(Location.facility_id == facility_id).all()


def get_location_by_id(db: Session, location_id: int) -> Location:
    """指定された拠点を取得"""
    return db.query(Location).filter(Location.location_id == location_id).first()


# ============ スタッフの処理 ============

def create_staff(db: Session, staff: schemas.StaffCreate) -> Staff:
    """スタッフを新規作成"""
    # ⚠️ IMMUTABLE: マルチテナント分離 - facility_id を保持
    db_staff = Staff(
        facility_id=staff.facility_id,
        location_id=staff.location_id,
        staff_name=staff.staff_name,
        position=staff.position
    )
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    return db_staff


def get_staffs_by_facility(db: Session, facility_id: int) -> list[Staff]:
    """指定された事業所のスタッフをすべて取得"""
    # ⚠️ IMMUTABLE: マルチテナント分離 - facility_id で所属を確認
    return db.query(Staff).filter(Staff.facility_id == facility_id).all()


def get_staff_by_id(db: Session, staff_id: int) -> Staff:
    """指定されたスタッフを取得"""
    return db.query(Staff).filter(Staff.staff_id == staff_id).first()


def delete_staff(db: Session, staff_id: int) -> bool:
    """スタッフを削除"""
    db_staff = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if not db_staff:
        return False

    db.delete(db_staff)
    db.commit()
    return True
