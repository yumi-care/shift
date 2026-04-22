-- Phase 1：法人・事業所・拠点の登録

-- 法人テーブル
CREATE TABLE IF NOT EXISTS corporations (
    corp_id SERIAL PRIMARY KEY,
    corp_name VARCHAR(255) NOT NULL,
    corp_number VARCHAR(13) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 事業所テーブル
CREATE TABLE IF NOT EXISTS facilities (
    facility_id SERIAL PRIMARY KEY,
    corp_id INT NOT NULL REFERENCES corporations(corp_id) ON DELETE CASCADE,
    facility_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    capacity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 拠点テーブル
CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    facility_id INT NOT NULL REFERENCES facilities(facility_id) ON DELETE CASCADE,
    location_name VARCHAR(255) NOT NULL,
    address TEXT,
    business_hours_start TIME,
    business_hours_end TIME,
    staff_capacity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（検索を高速化）
CREATE INDEX IF NOT EXISTS idx_facilities_corp_id ON facilities(corp_id);
CREATE INDEX IF NOT EXISTS idx_locations_facility_id ON locations(facility_id);
