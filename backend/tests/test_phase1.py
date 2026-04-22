"""
Phase 1 のテスト

法人・事業所・拠点の登録が正しく動いているか確認
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.src.core.models import Base, Corporation, Facility, Location
from backend.src.phase1 import services, schemas


# テスト用データベース（メモリ内）
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base.metadata.create_all(bind=engine)


@pytest.fixture
def db():
    """テストごとにデータベースをリセット"""
    db = TestingSessionLocal()
    yield db
    db.close()


# ============ 法人のテスト ============

def test_create_corporation(db):
    """法人を作成できるか"""
    corp_data = schemas.CorporationCreate(
        corp_name="ゆうみのいえ",
        corp_number="1234567890123"
    )
    db_corp = services.create_corporation(db, corp_data)

    assert db_corp.corp_id is not None
    assert db_corp.corp_name == "ゆうみのいえ"
    assert db_corp.corp_number == "1234567890123"


def test_get_corporations(db):
    """法人を取得できるか"""
    # 2 つの法人を作成
    corp1 = schemas.CorporationCreate(
        corp_name="法人A",
        corp_number="1111111111111"
    )
    corp2 = schemas.CorporationCreate(
        corp_name="法人B",
        corp_number="2222222222222"
    )
    services.create_corporation(db, corp1)
    services.create_corporation(db, corp2)

    # すべて取得
    corps = services.get_corporations(db)
    assert len(corps) == 2


# ============ 事業所のテスト ============

def test_create_facility(db):
    """事業所を作成できるか"""
    # 法人を作成
    corp_data = schemas.CorporationCreate(
        corp_name="ゆうみのいえ",
        corp_number="1234567890123"
    )
    db_corp = services.create_corporation(db, corp_data)

    # 事業所を作成
    facility_data = schemas.FacilityCreate(
        corp_id=db_corp.corp_id,
        facility_name="ゆうみのいえ三本木",
        service_type="共同生活援助",
        capacity=6
    )
    db_facility = services.create_facility(db, facility_data)

    assert db_facility.facility_id is not None
    assert db_facility.corp_id == db_corp.corp_id
    assert db_facility.facility_name == "ゆうみのいえ三本木"


def test_get_facilities_by_corp(db):
    """⚠️ IMMUTABLE: マルチテナント分離テスト"""
    # 法人 A と B を作成
    corp_a = services.create_corporation(db, schemas.CorporationCreate(
        corp_name="法人A",
        corp_number="1111111111111"
    ))
    corp_b = services.create_corporation(db, schemas.CorporationCreate(
        corp_name="法人B",
        corp_number="2222222222222"
    ))

    # 法人 A に事業所を 2 つ作成
    services.create_facility(db, schemas.FacilityCreate(
        corp_id=corp_a.corp_id,
        facility_name="法人A事業所1",
        service_type="共同生活援助"
    ))
    services.create_facility(db, schemas.FacilityCreate(
        corp_id=corp_a.corp_id,
        facility_name="法人A事業所2",
        service_type="共同生活援助"
    ))

    # 法人 B に事業所を 1 つ作成
    services.create_facility(db, schemas.FacilityCreate(
        corp_id=corp_b.corp_id,
        facility_name="法人B事業所1",
        service_type="共同生活援助"
    ))

    # 法人 A の事業所を取得 → 2 つだけ返ってくるか
    facilities_a = services.get_facilities_by_corp(db, corp_a.corp_id)
    assert len(facilities_a) == 2

    # 法人 B の事業所を取得 → 1 つだけ返ってくるか
    facilities_b = services.get_facilities_by_corp(db, corp_b.corp_id)
    assert len(facilities_b) == 1


# ============ 拠点のテスト ============

def test_create_location(db):
    """拠点を作成できるか"""
    # 法人を作成
    db_corp = services.create_corporation(db, schemas.CorporationCreate(
        corp_name="ゆうみのいえ",
        corp_number="1234567890123"
    ))

    # 事業所を作成
    db_facility = services.create_facility(db, schemas.FacilityCreate(
        corp_id=db_corp.corp_id,
        facility_name="ゆうみのいえ",
        service_type="共同生活援助"
    ))

    # 拠点を作成
    location_data = schemas.LocationCreate(
        facility_id=db_facility.facility_id,
        location_name="三本木",
        address="愛知県豊橋市三本木町",
        business_hours_start="08:00",
        business_hours_end="18:00",
        staff_capacity=5
    )
    db_location = services.create_location(db, location_data)

    assert db_location.location_id is not None
    assert db_location.location_name == "三本木"


def test_get_locations_by_facility(db):
    """事業所の拠点を取得できるか"""
    # 法人→事業所を作成
    db_corp = services.create_corporation(db, schemas.CorporationCreate(
        corp_name="ゆうみのいえ",
        corp_number="1234567890123"
    ))
    db_facility = services.create_facility(db, schemas.FacilityCreate(
        corp_id=db_corp.corp_id,
        facility_name="ゆうみのいえ",
        service_type="共同生活援助"
    ))

    # 拠点を 2 つ作成
    for i in range(2):
        services.create_location(db, schemas.LocationCreate(
            facility_id=db_facility.facility_id,
            location_name=f"拠点{i+1}"
        ))

    # 事業所の拠点を取得
    locations = services.get_locations_by_facility(db, db_facility.facility_id)
    assert len(locations) == 2
