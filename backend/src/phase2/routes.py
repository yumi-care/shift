"""
Phase 2：API エンドポイント

スタッフ登録の Web 画面から呼ばれる API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.phase2 import schemas, services

router = APIRouter(
    prefix="/api/phase2",
    tags=["phase2"]
)


# ============ 法人 API ============

@router.get("/corporations/", response_model=list[schemas.CorporationResponse])
def list_corporations(db: Session = Depends(get_db)):
    """すべての法人を取得"""
    return services.get_corporations(db)


@router.get("/corporations/{corp_id}", response_model=schemas.CorporationResponse)
def get_corporation(corp_id: int, db: Session = Depends(get_db)):
    """指定された法人を取得"""
    db_corp = services.get_corporation_by_id(db, corp_id)
    if not db_corp:
        raise HTTPException(status_code=404, detail="法人が見つかりません")
    return db_corp


# ============ 事業所 API ============

@router.get("/corporations/{corp_id}/facilities/", response_model=list[schemas.FacilityResponse])
def list_facilities(corp_id: int, db: Session = Depends(get_db)):
    """指定された法人の事業所をすべて取得"""
    # ⚠️ IMMUTABLE: マルチテナント分離 - corp_id で所属を確認
    db_corp = services.get_corporation_by_id(db, corp_id)
    if not db_corp:
        raise HTTPException(status_code=404, detail="法人が見つかりません")

    return services.get_facilities_by_corp(db, corp_id)


@router.get("/facilities/{facility_id}", response_model=schemas.FacilityResponse)
def get_facility(facility_id: int, db: Session = Depends(get_db)):
    """指定された事業所を取得"""
    db_facility = services.get_facility_by_id(db, facility_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="事業所が見つかりません")
    return db_facility


# ============ 拠点 API ============

@router.get("/facilities/{facility_id}/locations/", response_model=list[schemas.LocationResponse])
def list_locations(facility_id: int, db: Session = Depends(get_db)):
    """指定された事業所の拠点をすべて取得"""
    return services.get_locations_by_facility(db, facility_id)


@router.get("/locations/{location_id}", response_model=schemas.LocationResponse)
def get_location(location_id: int, db: Session = Depends(get_db)):
    """指定された拠点を取得"""
    db_location = services.get_location_by_id(db, location_id)
    if not db_location:
        raise HTTPException(status_code=404, detail="拠点が見つかりません")
    return db_location


# ============ スタッフ API ============

@router.post("/staffs/", response_model=schemas.StaffResponse)
def create_staff(staff: schemas.StaffCreate, db: Session = Depends(get_db)):
    """新しいスタッフを作成"""
    # ⚠️ IMMUTABLE: 指定された facility_id, location_id が実在するか確認
    db_facility = services.get_facility_by_id(db, staff.facility_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="事業所が見つかりません")

    db_location = services.get_location_by_id(db, staff.location_id)
    if not db_location:
        raise HTTPException(status_code=404, detail="拠点が見つかりません")

    # location が facility に属しているか確認
    if db_location.facility_id != staff.facility_id:
        raise HTTPException(status_code=400, detail="拠点が事業所に属していません")

    return services.create_staff(db, staff)


@router.get("/facilities/{facility_id}/staffs/", response_model=list[schemas.StaffResponse])
def list_staffs(facility_id: int, db: Session = Depends(get_db)):
    """指定された事業所のスタッフをすべて取得"""
    # ⚠️ IMMUTABLE: マルチテナント分離 - facility_id で所属を確認
    db_facility = services.get_facility_by_id(db, facility_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="事業所が見つかりません")

    staffs = services.get_staffs_by_facility(db, facility_id)

    # location_name を追加
    result = []
    for staff in staffs:
        location = services.get_location_by_id(db, staff.location_id)
        staff_dict = {
            "staff_id": staff.staff_id,
            "facility_id": staff.facility_id,
            "location_id": staff.location_id,
            "staff_name": staff.staff_name,
            "position": staff.position,
            "location_name": location.location_name if location else None,
            "created_at": staff.created_at
        }
        result.append(staff_dict)

    return result


@router.get("/staffs/{staff_id}", response_model=schemas.StaffResponse)
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    """指定されたスタッフを取得"""
    db_staff = services.get_staff_by_id(db, staff_id)
    if not db_staff:
        raise HTTPException(status_code=404, detail="スタッフが見つかりません")

    location = services.get_location_by_id(db, db_staff.location_id)

    return {
        "staff_id": db_staff.staff_id,
        "facility_id": db_staff.facility_id,
        "location_id": db_staff.location_id,
        "staff_name": db_staff.staff_name,
        "position": db_staff.position,
        "location_name": location.location_name if location else None,
        "created_at": db_staff.created_at
    }


@router.delete("/staffs/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    """スタッフを削除"""
    success = services.delete_staff(db, staff_id)
    if not success:
        raise HTTPException(status_code=404, detail="スタッフが見つかりません")
    return {"message": "スタッフを削除しました"}
