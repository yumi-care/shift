"""
Phase 1：API エンドポイント

Web画面から呼ばれるAPI
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.database import get_db
from src.phase1 import schemas, services

router = APIRouter(
    prefix="/api/phase1",
    tags=["phase1"]
)


# ============ 法人 API ============

@router.post("/corporations/", response_model=schemas.CorporationResponse)
def create_corporation(corp: schemas.CorporationCreate, db: Session = Depends(get_db)):
    """新しい法人を作成"""
    return services.create_corporation(db, corp)


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

@router.post("/facilities/", response_model=schemas.FacilityResponse)
def create_facility(facility: schemas.FacilityCreate, db: Session = Depends(get_db)):
    """新しい事業所を作成"""
    # ⚠️ IMMUTABLE: 指定された corp_id が実在するか確認
    db_corp = services.get_corporation_by_id(db, facility.corp_id)
    if not db_corp:
        raise HTTPException(status_code=404, detail="法人が見つかりません")

    return services.create_facility(db, facility)


@router.get("/corporations/{corp_id}/facilities/", response_model=list[schemas.FacilityResponse])
def list_facilities(corp_id: int, db: Session = Depends(get_db)):
    """指定された法人の事業所をすべて取得"""
    # ⚠️ IMMUTABLE: マルチテナント分離 - corp_id で所属を確認
    db_corp = services.get_corporation_by_id(db, corp_id)
    if not db_corp:
        raise HTTPException(status_code=404, detail="法人が見つかりません")

    return services.get_facilities_by_corp(db, corp_id)


@router.get("/facilities/{facility_id}", response_model=schemas.FacilityResponse)
def get_facility(facility_id: int, corp_id: int, db: Session = Depends(get_db)):
    """指定された事業所を取得"""
    # ⚠️ IMMUTABLE: corp_id で権限確認
    db_facility = services.get_facility_by_id(db, facility_id, corp_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="事業所が見つかりません")

    return db_facility


# ============ 拠点 API ============

@router.post("/locations/", response_model=schemas.LocationResponse)
def create_location(location: schemas.LocationCreate, db: Session = Depends(get_db)):
    """新しい拠点を作成"""
    # ⚠️ IMMUTABLE: 指定された facility_id が実在するか確認
    db_facility = services.get_facility_by_id(db, location.facility_id, location.corp_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="事業所が見つかりません")

    return services.create_location(db, location)


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


# ============ 削除 API ============

@router.delete("/locations/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)):
    """拠点を削除"""
    success = services.delete_location(db, location_id)
    if not success:
        raise HTTPException(status_code=404, detail="拠点が見つかりません")
    return {"message": "拠点を削除しました"}


@router.delete("/facilities/{facility_id}")
def delete_facility(facility_id: int, corp_id: int, db: Session = Depends(get_db)):
    """事業所を削除"""
    # ⚠️ IMMUTABLE: corp_id で権限確認
    success = services.delete_facility(db, facility_id, corp_id)
    if not success:
        raise HTTPException(status_code=404, detail="事業所が見つかりません")
    return {"message": "事業所を削除しました"}


@router.delete("/corporations/{corp_id}")
def delete_corporation(corp_id: int, db: Session = Depends(get_db)):
    """法人を削除"""
    # ⚠️ IMMUTABLE: corp_id で権限確認
    success = services.delete_corporation(db, corp_id)
    if not success:
        raise HTTPException(status_code=404, detail="法人が見つかりません")
    return {"message": "法人を削除しました"}
