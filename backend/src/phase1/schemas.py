"""
Phase 1：入出力データ定義

Web画面からのリクエスト、APIからのレスポンスのフォーマットを定義
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# 法人の入力データ
class CorporationCreate(BaseModel):
    """法人を新規作成する時の入力"""
    corp_name: str  # 法人名
    corp_number: str  # 法人番号（13桁）


# 法人の出力データ
class CorporationResponse(BaseModel):
    """API から返される法人情報"""
    corp_id: int
    corp_name: str
    corp_number: str
    created_at: datetime

    class Config:
        from_attributes = True


# 事業所の入力データ
class FacilityCreate(BaseModel):
    """事業所を新規作成する時の入力"""
    corp_id: int  # どの法人に属するか
    facility_name: str  # 事業所名
    department: str  # 部門（welfare: 福祉, care: 介護）
    service_type: str  # サービス種別（共同生活援助など）
    capacity: Optional[int] = None  # 定員数


# 事業所の出力データ
class FacilityResponse(BaseModel):
    """API から返される事業所情報"""
    facility_id: int
    corp_id: int
    facility_name: str
    department: str
    service_type: str
    capacity: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# 拠点の入力データ
class LocationCreate(BaseModel):
    """拠点を新規作成する時の入力"""
    facility_id: int  # どの事業所に属するか
    location_name: str  # 拠点名
    address: Optional[str] = None  # 所在地
    business_hours_start: Optional[str] = None  # 営業開始時刻（"08:00"）
    business_hours_end: Optional[str] = None  # 営業終了時刻（"18:00"）
    staff_capacity: Optional[int] = None  # 職員の人数枠
    # ⚠️ IMMUTABLE: マルチテナント分離用
    corp_id: int = None  # 法人ID（権限チェック用）


# 拠点の出力データ
class LocationResponse(BaseModel):
    """API から返される拠点情報"""
    location_id: int
    facility_id: int
    location_name: str
    address: Optional[str]
    business_hours_start: Optional[str]
    business_hours_end: Optional[str]
    staff_capacity: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
