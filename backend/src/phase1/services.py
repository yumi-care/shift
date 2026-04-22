"""
Phase 1：ビジネスロジック

データベースへの登録・取得処理
"""

from sqlalchemy.orm import Session
from sqlalchemy.sql import and_
from src.core.models import Corporation, Facility, Location
from src.phase1 import schemas
from datetime import time as dt_time


# ============ 法人の処理 ============

def create_corporation(db: Session, corp: schemas.CorporationCreate) -> Corporation:
    """法人を新規作成"""
    db_corp = Corporation(
        corp_name=corp.corp_name,
        corp_number=corp.corp_number
    )
    db.add(db_corp)
    db.commit()
    db.refresh(db_corp)
    return db_corp


def get_corporations(db: Session) -> list[Corporation]:
    """すべての法人を取得"""
    return db.query(Corporation).all()


def get_corporation_by_id(db: Session, corp_id: int) -> Corporation:
    """指定された法人を取得"""
    return db.query(Corporation).filter(Corporation.corp_id == corp_id).first()


# ============ 事業所の処理 ============

def create_facility(db: Session, facility: schemas.FacilityCreate) -> Facility:
    """事業所を新規作成"""
    # ⚠️ IMMUTABLE: マルチテナント分離 - corp_id で所属を管理
    db_facility = Facility(
        corp_id=facility.corp_id,
        facility_name=facility.facility_name,
        department=facility.department,
        service_type=facility.service_type,
        capacity=facility.capacity
    )
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility


def get_facilities_by_corp(db: Session, corp_id: int) -> list[Facility]:
    """指定された法人の事業所をすべて取得"""
    # ⚠️ IMMUTABLE: WHERE corp_id = xxx フィルタは必須
    return db.query(Facility).filter(Facility.corp_id == corp_id).all()


def get_facility_by_id(db: Session, facility_id: int, corp_id: int) -> Facility:
    """指定された事業所を取得（マルチテナント分離）"""
    # ⚠️ IMMUTABLE: corp_id で確認して、権限チェック
    return db.query(Facility).filter(
        and_(Facility.facility_id == facility_id, Facility.corp_id == corp_id)
    ).first()


# ============ 拠点の処理 ============

def create_location(db: Session, location: schemas.LocationCreate) -> dict:
    """拠点を新規作成"""
    # 時間文字列を time オブジェクトに変換
    start_time = None
    end_time = None
    if location.business_hours_start:
        try:
            h, m = location.business_hours_start.split(':')
            start_time = dt_time(int(h), int(m))
        except:
            pass
    if location.business_hours_end:
        try:
            h, m = location.business_hours_end.split(':')
            end_time = dt_time(int(h), int(m))
        except:
            pass

    db_location = Location(
        facility_id=location.facility_id,
        location_name=location.location_name,
        address=location.address,
        business_hours_start=start_time,
        business_hours_end=end_time,
        staff_capacity=location.staff_capacity
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)

    # time オブジェクトを文字列に変換して返す
    return {
        "location_id": db_location.location_id,
        "facility_id": db_location.facility_id,
        "location_name": db_location.location_name,
        "address": db_location.address,
        "business_hours_start": db_location.business_hours_start.strftime("%H:%M") if db_location.business_hours_start else None,
        "business_hours_end": db_location.business_hours_end.strftime("%H:%M") if db_location.business_hours_end else None,
        "staff_capacity": db_location.staff_capacity,
        "created_at": db_location.created_at
    }


def get_locations_by_facility(db: Session, facility_id: int) -> list[dict]:
    """指定された事業所の拠点をすべて取得"""
    locations = db.query(Location).filter(Location.facility_id == facility_id).all()
    return [_location_to_dict(loc) for loc in locations]


def get_location_by_id(db: Session, location_id: int) -> dict:
    """指定された拠点を取得"""
    location = db.query(Location).filter(Location.location_id == location_id).first()
    return _location_to_dict(location) if location else None


def _location_to_dict(location: Location) -> dict:
    """Location オブジェクトを辞書に変換"""
    return {
        "location_id": location.location_id,
        "facility_id": location.facility_id,
        "location_name": location.location_name,
        "address": location.address,
        "business_hours_start": location.business_hours_start.strftime("%H:%M") if location.business_hours_start else None,
        "business_hours_end": location.business_hours_end.strftime("%H:%M") if location.business_hours_end else None,
        "staff_capacity": location.staff_capacity,
        "created_at": location.created_at
    }


# ============ 削除処理 ============

def delete_location(db: Session, location_id: int) -> bool:
    """拠点を削除"""
    db_location = db.query(Location).filter(Location.location_id == location_id).first()
    if not db_location:
        return False
    db.delete(db_location)
    db.commit()
    return True


def delete_facility(db: Session, facility_id: int, corp_id: int) -> bool:
    """事業所を削除（マルチテナント分離）"""
    # ⚠️ IMMUTABLE: corp_id で権限確認
    db_facility = db.query(Facility).filter(
        and_(Facility.facility_id == facility_id, Facility.corp_id == corp_id)
    ).first()
    if not db_facility:
        return False

    # 拠点を先に削除
    db.query(Location).filter(Location.facility_id == facility_id).delete()
    db.delete(db_facility)
    db.commit()
    return True


def delete_corporation(db: Session, corp_id: int) -> bool:
    """法人を削除（配下の事業所・拠点も削除）"""
    # ⚠️ IMMUTABLE: corp_id で権限確認
    db_corp = db.query(Corporation).filter(Corporation.corp_id == corp_id).first()
    if not db_corp:
        return False

    # 事業所に紐づく拠点を削除
    facilities = db.query(Facility).filter(Facility.corp_id == corp_id).all()
    for facility in facilities:
        db.query(Location).filter(Location.facility_id == facility.facility_id).delete()

    # 事業所を削除
    db.query(Facility).filter(Facility.corp_id == corp_id).delete()

    # 法人を削除
    db.delete(db_corp)
    db.commit()
    return True
