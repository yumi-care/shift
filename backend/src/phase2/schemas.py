"""
Phase 2：入出力データ定義

スタッフ登録関連のリクエスト・レスポンスフォーマット
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# スタッフの入力データ
class StaffCreate(BaseModel):
    """スタッフを新規作成する時の入力"""
    facility_id: int  # 事業所ID
    location_id: int  # 拠点ID
    staff_name: str  # スタッフ名
    position: str  # 職種


# スタッフの出力データ
class StaffResponse(BaseModel):
    """API から返されるスタッフ情報"""
    staff_id: int
    facility_id: int
    location_id: int
    staff_name: str
    position: str
    location_name: Optional[str] = None  # 拠点名（JOINで取得）
    created_at: datetime

    class Config:
        from_attributes = True


# 法人の出力データ（Phase 2 用）
class CorporationResponse(BaseModel):
    """API から返される法人情報"""
    corp_id: int
    corp_name: str

    class Config:
        from_attributes = True


# 事業所の出力データ（Phase 2 用）
class FacilityResponse(BaseModel):
    """API から返される事業所情報"""
    facility_id: int
    facility_name: str
    service_type: str

    class Config:
        from_attributes = True


# 拠点の出力データ（Phase 2 用）
class LocationResponse(BaseModel):
    """API から返される拠点情報"""
    location_id: int
    location_name: str

    class Config:
        from_attributes = True
