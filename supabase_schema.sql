-- ====================================================================
-- SUPABASE SCHEMA: Doctor Leave @ LINE
-- Bangkok Hospital Siriroj (BSI)
-- Version: 1.0 (Hospital Production Ready)
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing objects if resetting (Cascade)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS approval_logs CASCADE;
DROP TABLE IF EXISTS approval_routes CASCADE;
DROP TABLE IF EXISTS leave_attachments CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS leave_types CASCADE;
DROP TABLE IF EXISTS doctor_roles CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

DROP TYPE IF EXISTS doctor_type_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS leave_status_enum CASCADE;
DROP TYPE IF EXISTS count_mode_enum CASCADE;
DROP TYPE IF EXISTS half_day_enum CASCADE;
DROP TYPE IF EXISTS approval_action_enum CASCADE;

-- 3. Custom ENUM Types
CREATE TYPE doctor_type_enum AS ENUM ('FULL_TIME', 'PART_TIME');
CREATE TYPE user_role_enum AS ENUM ('DOCTOR', 'DEPT_HEAD', 'MEDICAL_ADMIN', 'HR', 'ADMIN');
CREATE TYPE leave_status_enum AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE count_mode_enum AS ENUM ('WORKING_DAYS', 'CALENDAR_DAYS');
CREATE TYPE half_day_enum AS ENUM ('FULL_DAY', 'MORNING', 'AFTERNOON');
CREATE TYPE approval_action_enum AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'OVERRIDDEN');

-- 4. Departments (แผนกและการตั้งค่าโควตาขั้นต่ำ/สูงสุด)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,                  -- เช่น 'MED', 'SURG', 'ER', 'PED'
    name_th VARCHAR(255) NOT NULL,                     -- เช่น 'อายุรกรรม'
    name_en VARCHAR(255),                              -- เช่น 'Internal Medicine'
    min_staff_required INT NOT NULL DEFAULT 5,         -- แพทย์ขั้นต่ำที่ต้องปฏิบัติงาน (เช่น 5 คน)
    max_leave_per_day INT NOT NULL DEFAULT 3,          -- แพทย์ที่ลาพร้อมกันได้สูงสุดต่อวัน (เช่น 3 คน)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Doctors (ข้อมูลแพทย์ และการผูก LINE Account)
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,          -- รหัสพนักงานแพทย์
    line_user_id VARCHAR(100) UNIQUE,                 -- LINE User ID (ได้หลัง Verify ครั้งแรก)
    prefix_th VARCHAR(50) DEFAULT 'นพ.',               -- คำนำหน้า เช่น นพ., พญ.
    first_name_th VARCHAR(100) NOT NULL,
    last_name_th VARCHAR(100) NOT NULL,
    first_name_en VARCHAR(100),
    last_name_en VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),                                -- เบอร์โทรศัพท์สำหรับโทรฉุกเฉิน / OTP
    doctor_type doctor_type_enum NOT NULL DEFAULT 'FULL_TIME', -- 'FULL_TIME' หรือ 'PART_TIME'
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Doctor Roles (สิทธิ์การใช้งาน เช่น แพทย์, หัวหน้าศูนย์, พี่กุ้ง แอดมินฝ่ายการแพทย์)
CREATE TABLE doctor_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    role user_role_enum NOT NULL DEFAULT 'DOCTOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(doctor_id, role)
);

-- 7. Leave Types (ประเภทการลา และกฎทางธุรกิจ)
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,                  -- 'VACATION', 'SICK', 'TRAINING', 'UNPAID'
    name_th VARCHAR(100) NOT NULL,                     -- เช่น 'ลาพักผ่อน', 'ลาป่วย'
    name_en VARCHAR(100),
    count_mode count_mode_enum NOT NULL DEFAULT 'WORKING_DAYS',
    allows_half_day BOOLEAN NOT NULL DEFAULT TRUE,      -- ลาครึ่งวันได้หรือไม่
    requires_attachment BOOLEAN NOT NULL DEFAULT FALSE, -- ต้องแนบเอกสารหรือไม่
    attachment_threshold_days NUMERIC(4, 1) DEFAULT 2.0, -- ถ้าลาเกินกี่วันต้องแนบเอกสาร (เช่น ป่วยเกิน 2 วัน)
    min_notice_days INT NOT NULL DEFAULT 0,            -- ต้องแจ้งล่วงหน้ากี่วัน (พักร้อน = 7 วัน)
    max_days_per_request NUMERIC(4, 1),                -- ลาสูงสุดได้ครั้งละกี่วัน
    allows_backdate BOOLEAN NOT NULL DEFAULT FALSE,     -- ลาย้อนหลังได้หรือไม่ (ป่วยได้, พักร้อนไม่ได้)
    is_full_time_only BOOLEAN NOT NULL DEFAULT TRUE,   -- ใช้ได้เฉพาะแพทย์ Full-time หรือไม่
    sort_order INT DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. Holidays (วันหยุดนักขัตฤกษ์ของ รพ.)
CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE UNIQUE NOT NULL,
    name_th VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. Leave Balances (สิทธิ์วันลาประจำปีของแพทย์)
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL,                          -- ปี พ.ศ. หรือ ค.ศ. เช่น 2026
    entitlement_days NUMERIC(4, 1) NOT NULL DEFAULT 0, -- สิทธิ์ที่ได้รับในปีนี้
    carried_over_days NUMERIC(4, 1) NOT NULL DEFAULT 0,-- ยกยอดมาจากปีก่อน
    used_days NUMERIC(4, 1) NOT NULL DEFAULT 0,        -- วันที่อนุมัติและใช้ไปแล้ว
    pending_days NUMERIC(4, 1) NOT NULL DEFAULT 0,     -- วันที่ยื่นลาแล้วแต่รออนุมัติ
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(doctor_id, leave_type_id, fiscal_year)
);

-- View สำหรับดูยอดคงเหลือจริง (Remaining Balance)
CREATE OR REPLACE VIEW v_doctor_leave_balances AS
SELECT 
    b.id,
    b.doctor_id,
    d.employee_id,
    d.prefix_th || d.first_name_th || ' ' || d.last_name_th AS doctor_name,
    lt.code AS leave_type_code,
    lt.name_th AS leave_type_name,
    b.fiscal_year,
    (b.entitlement_days + b.carried_over_days) AS total_quota,
    b.used_days,
    b.pending_days,
    ((b.entitlement_days + b.carried_over_days) - (b.used_days + b.pending_days)) AS remaining_days
FROM leave_balances b
JOIN doctors d ON b.doctor_id = d.id
JOIN leave_types lt ON b.leave_type_id = lt.id;

-- 10. Leave Requests (ตารางใบลา)
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no VARCHAR(50) UNIQUE NOT NULL,            -- เช่น 'LV-2026-00001'
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days NUMERIC(4, 1) NOT NULL,              -- เช่น 1.0, 0.5, 3.0
    half_day_type half_day_enum NOT NULL DEFAULT 'FULL_DAY',
    reason TEXT,                                       -- เหตุผลการลา
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,       -- เป็นการลาฉุกเฉิน (วันเดียวกัน) หรือไม่
    is_exception BOOLEAN NOT NULL DEFAULT FALSE,       -- ยื่นเป็นกรณีพิเศษ (ขอนอกเกณฑ์) หรือไม่
    upload_later BOOLEAN NOT NULL DEFAULT FALSE,       -- เลือกแนบเอกสารตามหลัง (ภายใน 3 วัน)
    status leave_status_enum NOT NULL DEFAULT 'PENDING',
    current_step INT NOT NULL DEFAULT 1,
    total_steps INT NOT NULL DEFAULT 1,
    idempotency_key VARCHAR(100) UNIQUE,               -- กันกดเบิ้ลซ้ำ
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Leave Attachments (ไฟล์แนบ เช่น ใบรับรองแพทย์, หนังสือเชิญอบรม)
CREATE TABLE leave_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,                        -- Path บน Supabase Storage
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Approval Routes (กำหนดสายอนุมัติ: แพทย์ท่านนี้ ใครเป็นผู้อนุมัติ)
CREATE TABLE approval_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 1,                 -- ขั้นที่ 1 (หัวหน้าศูนย์), ขั้นที่ 2 (ผอ.แพทย์)
    approver_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(doctor_id, step_order)
);

-- 13. Approval Logs (ประวัติการดำเนินการและการอนุมัติ)
CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    step_order INT NOT NULL DEFAULT 1,
    approver_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    action approval_action_enum NOT NULL,              -- APPROVED, REJECTED, OVERRIDDEN
    comments TEXT,                                     -- ความเห็น / เหตุผลที่ไม่อนุมัติ
    acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Audit Logs (เก็บบันทึกประวัติการเปลี่ยนแปลงทั้งหมดตามเกณฑ์ Audit / PDPA)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,                       -- INSERT, UPDATE, DELETE
    actor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TRIGGERS & BUSINESS LOGIC FUNCTIONS
-- ====================================================================

-- Function 1: อัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doctors_updated
BEFORE UPDATE ON doctors
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_leave_requests_updated
BEFORE UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Function 2: Generate เลขที่ใบลาอัตโนมัติ (Format: LV-YYYY-NNNNN)
CREATE OR REPLACE FUNCTION generate_leave_request_no()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    seq_num INT;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq_num 
    FROM leave_requests 
    WHERE TO_CHAR(created_at, 'YYYY') = current_year;

    NEW.request_no := 'LV-' || current_year || '-' || LPAD(seq_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_leave_request_no
BEFORE INSERT ON leave_requests
FOR EACH ROW
WHEN (NEW.request_no IS NULL OR NEW.request_no = '')
EXECUTE FUNCTION generate_leave_request_no();

-- Function 3: ตัดยอด/คืนยอดวันลาอัตโนมัติ (Sync Leave Balances)
CREATE OR REPLACE FUNCTION sync_leave_balance_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    req_year INT;
BEGIN
    req_year := EXTRACT(YEAR FROM NEW.start_date);

    -- เมื่อยื่นใบลาใหม่ (PENDING) -> เพิ่ม pending_days
    IF (TG_OP = 'INSERT' AND NEW.status = 'PENDING') THEN
        UPDATE leave_balances
        SET pending_days = pending_days + NEW.duration_days,
            updated_at = NOW()
        WHERE doctor_id = NEW.doctor_id 
          AND leave_type_id = NEW.leave_type_id 
          AND fiscal_year = req_year;

    -- เมื่อเปลี่ยนสถานะ
    ELSIF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
        -- ได้รับการอนุมัติ (APPROVED) -> ลด pending, เพิ่ม used
        IF (NEW.status = 'APPROVED') THEN
            UPDATE leave_balances
            SET pending_days = GREATEST(0, pending_days - NEW.duration_days),
                used_days = used_days + NEW.duration_days,
                updated_at = NOW()
            WHERE doctor_id = NEW.doctor_id 
              AND leave_type_id = NEW.leave_type_id 
              AND fiscal_year = req_year;

        -- โดนไม่อนุมัติ (REJECTED) หรือ ยกเลิก (CANCELLED) จาก PENDING -> คืน pending
        ELSIF (NEW.status IN ('REJECTED', 'CANCELLED') AND OLD.status = 'PENDING') THEN
            UPDATE leave_balances
            SET pending_days = GREATEST(0, pending_days - NEW.duration_days),
                updated_at = NOW()
            WHERE doctor_id = NEW.doctor_id 
              AND leave_type_id = NEW.leave_type_id 
              AND fiscal_year = req_year;

        -- ยกเลิกใบลาที่เคย APPROVED ไปแล้ว -> คืน used_days
        ELSIF (NEW.status = 'CANCELLED' AND OLD.status = 'APPROVED') THEN
            UPDATE leave_balances
            SET used_days = GREATEST(0, used_days - NEW.duration_days),
                updated_at = NOW()
            WHERE doctor_id = NEW.doctor_id 
              AND leave_type_id = NEW.leave_type_id 
              AND fiscal_year = req_year;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_leave_balance
AFTER INSERT OR UPDATE OF status ON leave_requests
FOR EACH ROW EXECUTE FUNCTION sync_leave_balance_on_status_change();

-- Function 4: ตรวจสอบโควตาแพทย์ลาสูงสุดต่อวันของแผนก (Department Daily Quota Check)
CREATE OR REPLACE FUNCTION check_department_quota(
    p_dept_id UUID, 
    p_date DATE
)
RETURNS TABLE (
    dept_name VARCHAR,
    max_allowed INT,
    current_on_leave BIGINT,
    is_quota_exceeded BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH on_leave_count AS (
        SELECT COUNT(lr.id) AS cnt
        FROM leave_requests lr
        JOIN doctors d ON lr.doctor_id = d.id
        WHERE d.department_id = p_dept_id
          AND lr.status IN ('PENDING', 'APPROVED')
          AND p_date BETWEEN lr.start_date AND lr.end_date
    )
    SELECT 
        dept.name_th,
        dept.max_leave_per_day,
        COALESCE(olc.cnt, 0) AS current_on_leave,
        (COALESCE(olc.cnt, 0) >= dept.max_leave_per_day) AS is_quota_exceeded
    FROM departments dept
    LEFT JOIN on_leave_count olc ON TRUE
    WHERE dept.id = p_dept_id;
END;
$$ LANGUAGE plpgsql;


-- ====================================================================
-- SEED DATA (ข้อมูลเริ่มต้นจำลองสำหรับ รพ.กรุงเทพสิริโรจน์ - BSI)
-- ====================================================================

-- 1. Departments
INSERT INTO departments (id, code, name_th, name_en, min_staff_required, max_leave_per_day) VALUES
('d1111111-1111-1111-1111-111111111111', 'MED', 'อายุรกรรม', 'Internal Medicine', 5, 3),
('d2222222-2222-2222-2222-222222222222', 'SURG', 'ศัลยกรรม', 'Surgery', 4, 2),
('d3333333-3333-3333-3333-333333333333', 'ER', 'อุบัติเหตุและฉุกเฉิน', 'Emergency Room', 6, 2),
('d4444444-4444-4444-4444-444444444444', 'OBGYN', 'สูติ-นรีเวชกรรม', 'Obstetrics and Gynecology', 3, 1)
ON CONFLICT (code) DO NOTHING;

-- 2. Leave Types
INSERT INTO leave_types (code, name_th, name_en, count_mode, allows_half_day, requires_attachment, attachment_threshold_days, min_notice_days, allows_backdate, is_full_time_only, sort_order) VALUES
('VACATION', 'ลาพักผ่อน', 'Annual Leave', 'WORKING_DAYS', TRUE, FALSE, 0, 7, FALSE, TRUE, 1),
('SICK', 'ลาป่วย', 'Sick Leave', 'WORKING_DAYS', TRUE, TRUE, 2.0, 0, TRUE, FALSE, 2),
('PERSONAL', 'ลากิจ', 'Personal Leave', 'WORKING_DAYS', TRUE, FALSE, 0, 3, FALSE, TRUE, 3),
('TRAINING', 'ลาฝึกอบรม / ประชุมวิชาการ', 'Training / Conference', 'WORKING_DAYS', FALSE, TRUE, 0, 14, FALSE, FALSE, 4),
('UNPAID', 'ลาไม่รับค่าตอบแทน / งดออกตรวจ', 'Leave Without Pay', 'WORKING_DAYS', TRUE, FALSE, 0, 3, FALSE, FALSE, 5),
('ORDINATION', 'ลาอุปสมบท', 'Ordination Leave', 'CALENDAR_DAYS', FALSE, TRUE, 0, 30, FALSE, TRUE, 6),
('MATERNITY', 'ลาคลอดบุตร', 'Maternity Leave', 'CALENDAR_DAYS', FALSE, TRUE, 0, 0, TRUE, TRUE, 7)
ON CONFLICT (code) DO NOTHING;

-- 3. Doctors (จำลองบุคลากรตามที่ประชุม)
INSERT INTO doctors (id, employee_id, prefix_th, first_name_th, last_name_th, doctor_type, department_id, phone, email) VALUES
-- พี่กุ้ง (แอดมินฝ่ายการแพทย์)
('c0000000-0000-0000-0000-000000000001', 'EMP-KOONG', 'คุณ', 'สิริมาศ (พี่กุ้ง)', 'ฝ่ายการแพทย์', 'FULL_TIME', 'd1111111-1111-1111-1111-111111111111', '076-361888', 'koong_med@bsi.hospital'),
-- นพ.ปารวี (หัวหน้าแผนกอายุรกรรม / Approver)
('c0000000-0000-0000-0000-000000000002', 'DOC-001', 'นพ.', 'ปารวี', 'ชาญวิทย์', 'FULL_TIME', 'd1111111-1111-1111-1111-111111111111', '081-1112233', 'paravee.c@bsi.hospital'),
-- นพ.ชาติ (แพทย์ประจำ FT แผนกอายุรกรรม)
('c0000000-0000-0000-0000-000000000003', 'DOC-002', 'นพ.', 'ชาติชาย', 'วิสัยทัศน์', 'FULL_TIME', 'd1111111-1111-1111-1111-111111111111', '082-2223344', 'chartchai.v@bsi.hospital'),
-- พญ.กันต์ธีรา (แพทย์ Part-time แผนกอายุรกรรม)
('c0000000-0000-0000-0000-000000000004', 'DOC-003', 'พญ.', 'กันต์ธีรา', 'พิทักษ์ชีพ', 'PART_TIME', 'd1111111-1111-1111-1111-111111111111', '083-3334455', 'kantheera.p@bsi.hospital')
ON CONFLICT (employee_id) DO NOTHING;

-- 4. Doctor Roles
INSERT INTO doctor_roles (doctor_id, role) VALUES
('c0000000-0000-0000-0000-000000000001', 'MEDICAL_ADMIN'),
('c0000000-0000-0000-0000-000000000002', 'DEPT_HEAD'),
('c0000000-0000-0000-0000-000000000002', 'DOCTOR'),
('c0000000-0000-0000-0000-000000000003', 'DOCTOR'),
('c0000000-0000-0000-0000-000000000004', 'DOCTOR')
ON CONFLICT (doctor_id, role) DO NOTHING;

-- 5. Approval Route (นพ.ชาติชาย และ พญ.กันต์ธีรา ต้องให้นพ.ปารวี เป็นผู้อนุมัติ)
INSERT INTO approval_routes (doctor_id, step_order, approver_id) VALUES
('c0000000-0000-0000-0000-000000000003', 1, 'c0000000-0000-0000-0000-000000000002'),
('c0000000-0000-0000-0000-000000000004', 1, 'c0000000-0000-0000-0000-000000000002')
ON CONFLICT (doctor_id, step_order) DO NOTHING;

-- 6. Leave Balances ประจำปี 2026
-- นพ.ชาติชาย (Full-time: พักร้อน 10 วัน, ยกมา 2, ป่วย 30, กิจ 5)
INSERT INTO leave_balances (doctor_id, leave_type_id, fiscal_year, entitlement_days, carried_over_days, used_days, pending_days)
SELECT 
    'c0000000-0000-0000-0000-000000000003', 
    id, 
    2026, 
    CASE 
        WHEN code = 'VACATION' THEN 10.0
        WHEN code = 'SICK' THEN 30.0
        WHEN code = 'PERSONAL' THEN 5.0
        ELSE 0.0
    END,
    CASE 
        WHEN code = 'VACATION' THEN 2.0
        ELSE 0.0
    END,
    0, 0
FROM leave_types
WHERE is_active = TRUE
ON CONFLICT (doctor_id, leave_type_id, fiscal_year) DO NOTHING;
