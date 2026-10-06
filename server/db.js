import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Check Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));

export let supabase = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Connected to Supabase Cloud:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Supabase init failed, falling back to local database engine:', err.message);
  }
}

// Initial Seed Data matching D:\supabase_schema.sql
const getInitialSeedData = () => {
  const departments = [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      code: 'MED',
      name_th: 'อายุรกรรม',
      name_en: 'Internal Medicine',
      min_staff_required: 5,
      max_leave_per_day: 3,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'd2222222-2222-2222-2222-222222222222',
      code: 'SURG',
      name_th: 'ศัลยกรรม',
      name_en: 'Surgery',
      min_staff_required: 4,
      max_leave_per_day: 2,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'd3333333-3333-3333-3333-333333333333',
      code: 'ER',
      name_th: 'อุบัติเหตุและฉุกเฉิน',
      name_en: 'Emergency Room',
      min_staff_required: 6,
      max_leave_per_day: 2,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'd4444444-4444-4444-4444-444444444444',
      code: 'OBGYN',
      name_th: 'สูติ-นรีเวชกรรม',
      name_en: 'Obstetrics and Gynecology',
      min_staff_required: 3,
      max_leave_per_day: 1,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  const leave_types = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'VACATION',
      name_th: 'ลาพักผ่อน',
      name_en: 'Annual Leave',
      count_mode: 'WORKING_DAYS',
      allows_half_day: true,
      requires_attachment: false,
      attachment_threshold_days: 0,
      min_notice_days: 7,
      allows_backdate: false,
      is_full_time_only: true,
      sort_order: 1,
      is_active: true,
      color: '#0ea5e9'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'SICK',
      name_th: 'ลาป่วย',
      name_en: 'Sick Leave',
      count_mode: 'WORKING_DAYS',
      allows_half_day: true,
      requires_attachment: true,
      attachment_threshold_days: 2.0,
      min_notice_days: 0,
      allows_backdate: true,
      is_full_time_only: false,
      sort_order: 2,
      is_active: true,
      color: '#ef4444'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      code: 'PERSONAL',
      name_th: 'ลากิจ',
      name_en: 'Personal Leave',
      count_mode: 'WORKING_DAYS',
      allows_half_day: true,
      requires_attachment: false,
      attachment_threshold_days: 0,
      min_notice_days: 3,
      allows_backdate: false,
      is_full_time_only: true,
      sort_order: 3,
      is_active: true,
      color: '#f59e0b'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      code: 'TRAINING',
      name_th: 'ลาฝึกอบรม / ประชุมวิชาการ',
      name_en: 'Training / Conference',
      count_mode: 'WORKING_DAYS',
      allows_half_day: false,
      requires_attachment: true,
      attachment_threshold_days: 0,
      min_notice_days: 14,
      allows_backdate: false,
      is_full_time_only: false,
      sort_order: 4,
      is_active: true,
      color: '#8b5cf6'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      code: 'UNPAID',
      name_th: 'ลาไม่รับค่าตอบแทน / งดออกตรวจ',
      name_en: 'Leave Without Pay',
      count_mode: 'WORKING_DAYS',
      allows_half_day: true,
      requires_attachment: false,
      attachment_threshold_days: 0,
      min_notice_days: 3,
      allows_backdate: false,
      is_full_time_only: false,
      sort_order: 5,
      is_active: true,
      color: '#64748b'
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      code: 'ORDINATION',
      name_th: 'ลาอุปสมบท',
      name_en: 'Ordination Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: false,
      requires_attachment: true,
      attachment_threshold_days: 0,
      min_notice_days: 30,
      allows_backdate: false,
      is_full_time_only: true,
      sort_order: 6,
      is_active: true,
      color: '#d97706'
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      code: 'MATERNITY',
      name_th: 'ลาคลอดบุตร',
      name_en: 'Maternity Leave',
      count_mode: 'CALENDAR_DAYS',
      allows_half_day: false,
      requires_attachment: true,
      attachment_threshold_days: 0,
      min_notice_days: 0,
      allows_backdate: true,
      is_full_time_only: true,
      sort_order: 7,
      is_active: true,
      color: '#ec4899'
    }
  ];

  const doctors = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      employee_id: 'EMP-KOONG',
      line_user_id: 'U_KOONG_LINE_ADMIN',
      prefix_th: 'คุณ',
      first_name_th: 'สิริมาศ (พี่กุ้ง)',
      last_name_th: 'ฝ่ายการแพทย์',
      doctor_type: 'FULL_TIME',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      phone: '076-361888',
      email: 'koong_med@bsi.hospital',
      is_active: true,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      employee_id: 'DOC-001',
      line_user_id: 'U_DR_PARAVEE_HEAD',
      prefix_th: 'นพ.',
      first_name_th: 'ปารวี',
      last_name_th: 'ชาญวิทย์',
      doctor_type: 'FULL_TIME',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      phone: '081-1112233',
      email: 'paravee.c@bsi.hospital',
      is_active: true,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      employee_id: 'DOC-002',
      line_user_id: 'U_DR_CHARTCHAI',
      prefix_th: 'นพ.',
      first_name_th: 'ชาติชาย',
      last_name_th: 'วิสัยทัศน์',
      doctor_type: 'FULL_TIME',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      phone: '082-2223344',
      email: 'chartchai.v@bsi.hospital',
      is_active: true,
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      employee_id: 'DOC-003',
      line_user_id: 'U_DR_KANTHEERA_PT',
      prefix_th: 'พญ.',
      first_name_th: 'กันต์ธีรา',
      last_name_th: 'พิทักษ์ชีพ',
      doctor_type: 'PART_TIME',
      department_id: 'd1111111-1111-1111-1111-111111111111',
      phone: '083-3334455',
      email: 'kantheera.p@bsi.hospital',
      is_active: true,
      avatar: 'https://images.unsplash.com/photo-1594824813583-0570b240186c?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    }
  ];

  const doctor_roles = [
    { id: '00000000-0000-0000-0000-000000001000', doctor_id: 'c0000000-0000-0000-0000-000000000001', role: 'MEDICAL_ADMIN' },
    { id: '00000000-0000-0000-0000-000000001001', doctor_id: 'c0000000-0000-0000-0000-000000000002', role: 'DEPT_HEAD' },
    { id: '00000000-0000-0000-0000-000000001002', doctor_id: 'c0000000-0000-0000-0000-000000000002', role: 'DOCTOR' },
    { id: '00000000-0000-0000-0000-000000001003', doctor_id: 'c0000000-0000-0000-0000-000000000003', role: 'DOCTOR' },
    { id: '00000000-0000-0000-0000-000000001004', doctor_id: 'c0000000-0000-0000-0000-000000000004', role: 'DOCTOR' }
  ];

  const approval_routes = [
    {
      id: '00000000-0000-0000-0000-000000001005',
      doctor_id: 'c0000000-0000-0000-0000-000000000003',
      step_order: 1,
      approver_id: 'c0000000-0000-0000-0000-000000000002', // Dr. Paravee
      is_active: true
    },
    {
      id: '00000000-0000-0000-0000-000000001006',
      doctor_id: 'c0000000-0000-0000-0000-000000000004',
      step_order: 1,
      approver_id: 'c0000000-0000-0000-0000-000000000002', // Dr. Paravee
      is_active: true
    }
  ];

  const currentYear = new Date().getFullYear();

  // Balances for Dr. Chartchai (FT) and Dr. Kantheera (PT)
  const leave_balances = [
    // Dr. Chartchai (FT)
    {
      id: '00000000-0000-0000-0000-000000001007',
      doctor_id: 'c0000000-0000-0000-0000-000000000003',
      leave_type_id: '11111111-1111-1111-1111-111111111111',
      fiscal_year: currentYear,
      entitlement_days: 10.0,
      carried_over_days: 2.0,
      used_days: 2.0,
      pending_days: 0.0,
      updated_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000001008',
      doctor_id: 'c0000000-0000-0000-0000-000000000003',
      leave_type_id: '22222222-2222-2222-2222-222222222222',
      fiscal_year: currentYear,
      entitlement_days: 30.0,
      carried_over_days: 0.0,
      used_days: 1.0,
      pending_days: 0.0,
      updated_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000001009',
      doctor_id: 'c0000000-0000-0000-0000-000000000003',
      leave_type_id: '33333333-3333-3333-3333-333333333333',
      fiscal_year: currentYear,
      entitlement_days: 5.0,
      carried_over_days: 0.0,
      used_days: 0.0,
      pending_days: 0.0,
      updated_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000001010',
      doctor_id: 'c0000000-0000-0000-0000-000000000003',
      leave_type_id: '44444444-4444-4444-4444-444444444444',
      fiscal_year: currentYear,
      entitlement_days: 10.0,
      carried_over_days: 0.0,
      used_days: 0.0,
      pending_days: 0.0,
      updated_at: new Date().toISOString()
    },
    // Dr. Paravee (FT)
    {
      id: '00000000-0000-0000-0000-000000001011',
      doctor_id: 'c0000000-0000-0000-0000-000000000002',
      leave_type_id: '11111111-1111-1111-1111-111111111111',
      fiscal_year: currentYear,
      entitlement_days: 15.0,
      carried_over_days: 5.0,
      used_days: 4.0,
      pending_days: 0.0,
      updated_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000001012',
      doctor_id: 'c0000000-0000-0000-0000-000000000002',
      leave_type_id: '22222222-2222-2222-2222-222222222222',
      fiscal_year: currentYear,
      entitlement_days: 30.0,
      carried_over_days: 0.0,
      used_days: 0.0,
      pending_days: 0.0,
      updated_at: new Date().toISOString()
    }
  ];

  // Sample Leave Requests for Demo
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const leave_requests = [
    {
      id: '88888888-8888-8888-8888-888888888888',
      request_no: `LV-${currentYear}-00001`,
      doctor_id: 'c0000000-0000-0000-0000-000000000003',
      leave_type_id: '11111111-1111-1111-1111-111111111111',
      start_date: nextWeekStr,
      end_date: nextWeekStr,
      duration_days: 1.0,
      half_day_type: 'FULL_DAY',
      reason: 'ลาพักผ่อนประจำปี พาครอบครัวไปตรวจสุขภาพต่างจังหวัด',
      is_emergency: false,
      is_exception: false,
      upload_later: false,
      status: 'PENDING',
      current_step: 1,
      total_steps: 1,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  // Link initial pending days for req-sample-001
  const vacationBal = leave_balances.find(b => b.doctor_id === 'c0000000-0000-0000-0000-000000000003' && b.leave_type_id === '11111111-1111-1111-1111-111111111111');
  if (vacationBal) {
    vacationBal.pending_days = 1.0;
  }

  const holidays = [
    { id: '00000000-0000-0000-0000-000000001013', holiday_date: `${currentYear}-01-01`, name_th: 'วันขึ้นปีใหม่', is_active: true },
    { id: '00000000-0000-0000-0000-000000001014', holiday_date: `${currentYear}-04-13`, name_th: 'วันสงกรานต์', is_active: true },
    { id: '00000000-0000-0000-0000-000000001015', holiday_date: `${currentYear}-05-01`, name_th: 'วันแรงงานแห่งชาติ', is_active: true },
    { id: '00000000-0000-0000-0000-000000001016', holiday_date: `${currentYear}-12-05`, name_th: 'วันคล้ายวันพระบรมราชสมภพ ร.9', is_active: true }
  ];

  const approval_logs = [];
  const audit_logs = [
    {
      id: '00000000-0000-0000-0000-000000001017',
      table_name: 'leave_requests',
      record_id: '88888888-8888-8888-8888-888888888888',
      action: 'INSERT',
      actor_id: 'c0000000-0000-0000-0000-000000000003',
      new_data: { request_no: `LV-${currentYear}-00001`, status: 'PENDING' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ];
  const leave_attachments = [];

  return {
    departments,
    leave_types,
    doctors,
    doctor_roles,
    approval_routes,
    leave_balances,
    leave_requests,
    leave_attachments,
    approval_logs,
    audit_logs,
    holidays
  };
};

// Initialize file store if not exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- Initialization ---
let db = null;

export const initStore = async () => {
  const { loadStoreFromSupabase } = await import('./supabase_sync.js');
  let fallbackDb = null;
  
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      fallbackDb = JSON.parse(raw);
    } catch (err) {
      console.warn('Error reading store.json, resetting to seed:', err.message);
      fallbackDb = getInitialSeedData();
    }
  } else {
    fallbackDb = getInitialSeedData();
  }

  // Load from Supabase (or use fallback if disconnected)
  db = await loadStoreFromSupabase(fallbackDb);
  
  // Save the merged/fetched data back to local store
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
};


export const saveStore = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
    
    // Background sync to Supabase
    if (isSupabaseConfigured && supabase) {
      import('./supabase_sync.js').then(({ syncStoreToSupabase }) => {
        syncStoreToSupabase(db);
      }).catch(err => console.error('Failed to load sync module:', err));
    }
  } catch (err) {
    console.error('Failed to save store.json:', err);
  }
};

export const getDb = () => db;

// Reset Store for testing
export const resetStore = () => {
  db = getInitialSeedData();
  saveStore();
  return db;
};

