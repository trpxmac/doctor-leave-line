import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  saveStore,
  resetStore,
  isSupabaseConfigured,
  supabase
} from '../db.js';
import {
  sendLinePushMessage,
  buildDoctorSubmittedFlex,
  buildApproverRequestFlex,
  buildLeaveDecisionFlex,
  buildEmergencyAlertFlex,
  buildCancelAlertFlex,
  simulatedLineMessages,
  isLineConfigured
} from '../line.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4().substring(0, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for bandwidth optimization
});

// Middleware that conditionally applies multer only when Content-Type is multipart/form-data
const handleUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    upload.array('attachments', 3)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 2MB ต่อไฟล์)' });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  } else {
    next();
  }
};

// Helper: Format today's date in YYYY-MM-DD
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Calculate duration between two dates
function calculateDays(startDate, endDate, countMode = 'CALENDAR_DAYS', holidays = []) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  if (countMode === 'CALENDAR_DAYS') {
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // countMode === 'WORKING_DAYS'
  let days = 0;
  const current = new Date(start);
  
  // Create a Set of holiday dates (YYYY-MM-DD)
  const holidaySet = new Set(holidays.map(h => h.holiday_date));

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const date = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    
    const isHoliday = holidaySet.has(dateStr);

    if (!isWeekend && !isHoliday) {
      days++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

// -------------------------------------------------------------
// SYSTEM & HEALTH
// -------------------------------------------------------------
router.get('/health', (req, res) => {
  const db = getDb();
  res.json({
    status: 'ok',
    system: 'Doctor Leave @ LINE - Bangkok Hospital Siriroj',
    supabaseConnected: isSupabaseConfigured,
    lineConfigured: isLineConfigured,
    totalDoctors: db.doctors.length,
    totalLeaveRequests: db.leave_requests.length,
    serverTime: new Date().toISOString()
  });
});

router.post('/system/reset', (req, res) => {
  const freshDb = resetStore();
  res.json({ message: 'Database reset to initial BSI seed successfully', freshDb });
});

// -------------------------------------------------------------
// AUTH & ONBOARDING (LIFF)
// -------------------------------------------------------------
router.get('/auth/me', (req, res) => {
  const db = getDb();
  const lineUserId = req.query.lineUserId;
  if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });

  const doctor = db.doctors.find(d => d.line_user_id === lineUserId);
  res.json({ doctor: doctor || null });
});

router.post('/auth/link', (req, res) => {
  const db = getDb();
  const { lineUserId, employeeId } = req.body;
  if (!lineUserId || !employeeId) {
    return res.status(400).json({ error: 'lineUserId and employeeId are required' });
  }

  const doctor = db.doctors.find(d => d.employee_id === employeeId);
  if (!doctor) {
    return res.status(404).json({ error: 'ไม่พบรหัสพนักงานนี้ในระบบ' });
  }

  if (doctor.line_user_id && doctor.line_user_id !== lineUserId) {
    return res.status(400).json({ error: 'รหัสพนักงานนี้ผูกกับบัญชี LINE อื่นแล้ว' });
  }

  doctor.line_user_id = lineUserId;
  saveStore();

  res.json({ success: true, doctor });
});

// -------------------------------------------------------------
// DOCTORS & ROLES
// -------------------------------------------------------------
router.get('/doctors', (req, res) => {
  const db = getDb();
  const currentYear = new Date().getFullYear();

  const results = db.doctors.map(doc => {
    const dept = db.departments.find(d => d.id === doc.department_id);
    const roles = db.doctor_roles.filter(r => r.doctor_id === doc.id).map(r => r.role);
    const balances = db.leave_balances.filter(b => b.doctor_id === doc.id && b.fiscal_year === currentYear);
    
    return {
      ...doc,
      department_name: dept ? dept.name_th : 'ไม่ระบุ',
      department_code: dept ? dept.code : '',
      roles,
      balances
    };
  });

  res.json(results);
});

router.get('/doctors/:id', (req, res) => {
  const db = getDb();
  const currentYear = new Date().getFullYear();
  const doc = db.doctors.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });

  const dept = db.departments.find(d => d.id === doc.department_id);
  const roles = db.doctor_roles.filter(r => r.doctor_id === doc.id).map(r => r.role);

  // Compute remaining balances
  const balances = db.leave_balances
    .filter(b => b.doctor_id === doc.id && b.fiscal_year === currentYear)
    .map(b => {
      const lt = db.leave_types.find(t => t.id === b.leave_type_id);
      const total = Number(b.entitlement_days) + Number(b.carried_over_days);
      const remaining = total - Number(b.used_days) - Number(b.pending_days);
      return {
        ...b,
        leave_type_code: lt ? lt.code : '',
        leave_type_name: lt ? lt.name_th : '',
        total_quota: total,
        remaining_days: Math.max(0, remaining)
      };
    });

  res.json({
    ...doc,
    department: dept,
    roles,
    balances
  });
});

// -------------------------------------------------------------
// DEPARTMENTS & QUOTA RULES
// -------------------------------------------------------------
router.get('/departments', (req, res) => {
  const db = getDb();
  const today = getTodayString();

  const results = db.departments.map(dept => {
    // Doctors in dept
    const deptDoctors = db.doctors.filter(d => d.department_id === dept.id);
    
    // On-leave today
    const onLeaveToday = db.leave_requests.filter(req => {
      if (req.status !== 'APPROVED' && req.status !== 'PENDING') return false;
      const doc = db.doctors.find(d => d.id === req.doctor_id);
      if (!doc || doc.department_id !== dept.id) return false;
      return today >= req.start_date && today <= req.end_date;
    });

    return {
      ...dept,
      doctor_count: deptDoctors.length,
      on_leave_today_count: onLeaveToday.length,
      available_doctors_today: Math.max(0, deptDoctors.length - onLeaveToday.length),
      is_quota_exceeded_today: onLeaveToday.length >= dept.max_leave_per_day
    };
  });

  res.json(results);
});

router.put('/departments/:id', (req, res) => {
  const db = getDb();
  const dept = db.departments.find(d => d.id === req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const { min_staff_required, max_leave_per_day, name_th } = req.body;
  if (min_staff_required !== undefined) dept.min_staff_required = parseInt(min_staff_required, 10);
  if (max_leave_per_day !== undefined) dept.max_leave_per_day = parseInt(max_leave_per_day, 10);
  if (name_th !== undefined) dept.name_th = name_th;

  saveStore();
  res.json({ message: 'Department quota updated successfully', department: dept });
});

// -------------------------------------------------------------
// LEAVE TYPES
// -------------------------------------------------------------
router.get('/leave-types', (req, res) => {
  const db = getDb();
  const { doctorType } = req.query; // 'FULL_TIME' or 'PART_TIME'
  
  let types = db.leave_types.filter(t => t.is_active);
  if (doctorType === 'PART_TIME') {
    // Only leave types allowed for part time (is_full_time_only === false)
    types = types.filter(t => !t.is_full_time_only);
  }

  res.json(types.sort((a, b) => a.sort_order - b.sort_order));
});

// -------------------------------------------------------------
// BALANCES
// -------------------------------------------------------------
router.get('/balances/:doctorId', (req, res) => {
  const db = getDb();
  const currentYear = new Date().getFullYear();
  const doctorId = req.params.doctorId;

  const doc = db.doctors.find(d => d.id === doctorId);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });

  const balances = db.leave_balances
    .filter(b => b.doctor_id === doctorId && b.fiscal_year === currentYear)
    .map(b => {
      const lt = db.leave_types.find(t => t.id === b.leave_type_id);
      const total = Number(b.entitlement_days) + Number(b.carried_over_days);
      const remaining = total - Number(b.used_days) - Number(b.pending_days);
      return {
        ...b,
        leave_type_code: lt ? lt.code : '',
        leave_type_name: lt ? lt.name_th : '',
        total_quota: total,
        remaining_days: Math.max(0, remaining)
      };
    });

  res.json(balances);
});

router.put('/balances/:doctorId', (req, res) => {
  const db = getDb();
  const doctorId = req.params.doctorId;
  const { leave_type_id, entitlement_days, carried_over_days, fiscal_year } = req.body;
  const year = fiscal_year || new Date().getFullYear();

  let bal = db.leave_balances.find(b => b.doctor_id === doctorId && b.leave_type_id === leave_type_id && b.fiscal_year === year);
  if (!bal) {
    bal = {
      id: uuidv4(),
      doctor_id: doctorId,
      leave_type_id,
      fiscal_year: year,
      entitlement_days: parseFloat(entitlement_days) || 0,
      carried_over_days: parseFloat(carried_over_days) || 0,
      used_days: 0,
      pending_days: 0,
      updated_at: new Date().toISOString()
    };
    db.leave_balances.push(bal);
  } else {
    if (entitlement_days !== undefined) bal.entitlement_days = parseFloat(entitlement_days);
    if (carried_over_days !== undefined) bal.carried_over_days = parseFloat(carried_over_days);
    bal.updated_at = new Date().toISOString();
  }

  saveStore();
  res.json({ message: 'Balance updated', balance: bal });
});

// -------------------------------------------------------------
// DEPARTMENT QUOTA CHECK
// -------------------------------------------------------------
router.get('/quota-check', (req, res) => {
  const db = getDb();
  const { departmentId, date } = req.query;

  if (!departmentId || !date) {
    return res.status(400).json({ error: 'departmentId and date are required' });
  }

  const dept = db.departments.find(d => d.id === departmentId);
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  // Count active leaves on that date
  const onLeaveRequests = db.leave_requests.filter(req => {
    if (req.status !== 'APPROVED' && req.status !== 'PENDING') return false;
    const doc = db.doctors.find(d => d.id === req.doctor_id);
    if (!doc || doc.department_id !== departmentId) return false;
    return date >= req.start_date && date <= req.end_date;
  });

  const currentOnLeave = onLeaveRequests.length;
  const maxAllowed = dept.max_leave_per_day;
  const isQuotaExceeded = currentOnLeave >= maxAllowed;

  let status = 'NORMAL'; // Green
  if (currentOnLeave >= maxAllowed) {
    status = 'FULL'; // Red
  } else if (currentOnLeave === maxAllowed - 1) {
    status = 'NEAR_LIMIT'; // Amber
  }

  res.json({
    department_id: dept.id,
    department_name: dept.name_th,
    max_allowed: maxAllowed,
    min_staff_required: dept.min_staff_required,
    current_on_leave: currentOnLeave,
    is_quota_exceeded: isQuotaExceeded,
    status,
    on_leave_doctors: onLeaveRequests.map(r => {
      const doc = db.doctors.find(d => d.id === r.doctor_id);
      return {
        doctor_id: r.doctor_id,
        name: doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : 'แพทย์',
        request_no: r.request_no,
        status: r.status
      };
    })
  });
});

// -------------------------------------------------------------
// LEAVE REQUESTS
// -------------------------------------------------------------
router.get('/leave-requests', (req, res) => {
  const db = getDb();
  const { doctorId, status, departmentId, isEmergency, month, year } = req.query;

  let list = [...db.leave_requests];

  if (doctorId) {
    list = list.filter(r => r.doctor_id === doctorId);
  }
  if (status) {
    list = list.filter(r => r.status === status);
  }
  if (isEmergency !== undefined) {
    const isEmergBool = isEmergency === 'true' || isEmergency === true;
    list = list.filter(r => Boolean(r.is_emergency) === isEmergBool);
  }
  if (departmentId) {
    list = list.filter(r => {
      const doc = db.doctors.find(d => d.id === r.doctor_id);
      return doc && doc.department_id === departmentId;
    });
  }
  if (month && year) {
    const padMonth = String(month).padStart(2, '0');
    const target = `${year}-${padMonth}`;
    list = list.filter(r => r.start_date.startsWith(target) || r.end_date.startsWith(target));
  }

  // Enrich with doctor and leave_type details
  const enriched = list.map(reqItem => {
    const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
    const dept = doc ? db.departments.find(dp => dp.id === doc.department_id) : null;
    const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
    const attachments = db.leave_attachments.filter(a => a.request_id === reqItem.id);
    const logs = db.approval_logs.filter(al => al.request_id === reqItem.id);

    return {
      ...reqItem,
      doctor: doc ? {
        id: doc.id,
        employee_id: doc.employee_id,
        name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
        doctor_type: doc.doctor_type,
        phone: doc.phone,
        department_name: dept ? dept.name_th : '',
        department_id: doc.department_id,
        avatar: doc.avatar
      } : null,
      leave_type: leaveType ? {
        id: leaveType.id,
        code: leaveType.code,
        name_th: leaveType.name_th,
        color: leaveType.color
      } : null,
      attachments,
      approval_logs: logs
    };
  });

  // Sort newest first
  enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(enriched);
});

router.get('/leave-requests/:id', (req, res) => {
  const db = getDb();
  const reqItem = db.leave_requests.find(r => r.id === req.params.id);
  if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

  const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
  const dept = doc ? db.departments.find(dp => dp.id === doc.department_id) : null;
  const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
  const attachments = db.leave_attachments.filter(a => a.request_id === reqItem.id);
  const logs = db.approval_logs.filter(al => al.request_id === reqItem.id);

  res.json({
    ...reqItem,
    doctor: doc ? {
      id: doc.id,
      employee_id: doc.employee_id,
      name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
      doctor_type: doc.doctor_type,
      phone: doc.phone,
      department_name: dept ? dept.name_th : '',
      department_id: doc.department_id,
      avatar: doc.avatar
    } : null,
    leave_type: leaveType,
    attachments,
    approval_logs: logs
  });
});

// SUBMIT LEAVE REQUEST
router.post('/leave-requests', handleUpload, async (req, res) => {
  try {
    const db = getDb();
    const body = req.body || {};
    const {
      doctor_id,
      leave_type_id,
      start_date,
      end_date,
      half_day_type = 'FULL_DAY',
      reason = '',
      upload_later = 'false',
      submitted_by_admin = 'false'
    } = body;

    if (!doctor_id || !leave_type_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'doctor_id, leave_type_id, start_date, and end_date are required' });
    }

    const doc = db.doctors.find(d => d.id === doctor_id);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    // Attach department name for Flex Messages
    const dept = db.departments.find(dp => dp.id === doc.department_id);
    doc.department_name = dept ? dept.name_th : 'ไม่ระบุแผนก';

    const leaveType = db.leave_types.find(lt => lt.id === leave_type_id);
    if (!leaveType) return res.status(404).json({ error: 'Leave type not found' });

    // Validate Overlap / Duplicate Check
    const overlaps = db.leave_requests.filter(r => 
      r.doctor_id === doctor_id && 
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      start_date <= r.end_date && end_date >= r.start_date
    );

    if (overlaps.length > 0) {
      // Check half-day edge case (Morning + Afternoon on the same day)
      const isSameDay = start_date === end_date;
      const hasConflict = overlaps.some(r => {
        if (!isSameDay || r.start_date !== r.end_date) return true; // multi-day overlap is always conflict
        if (r.half_day_type === 'FULL_DAY' || half_day_type === 'FULL_DAY') return true;
        if (r.half_day_type === half_day_type) return true; // Both morning or both afternoon
        return false; // One is morning, one is afternoon -> allow
      });

      if (hasConflict) {
        return res.status(400).json({ error: 'คุณมีรายการลาที่ซ้อนทับกับช่วงเวลานี้อยู่ในระบบแล้ว (รออนุมัติ หรือ อนุมัติแล้ว)' });
      }
    }

    // Validate Full-time only check
    if (doc.doctor_type === 'PART_TIME' && leaveType.is_full_time_only) {
      return res.status(400).json({
        error: `แพทย์พาร์ทไทม์ (Part-time) ไม่สามารถยื่น${leaveType.name_th}ได้ มีสิทธิ์เฉพาะ 'ลาไม่รับค่าตอบแทน / งดออกตรวจ'`
      });
    }

    // Calculate duration
    let durationDays = 1.0;
    if (half_day_type === 'MORNING' || half_day_type === 'AFTERNOON') {
      durationDays = 0.5;
    } else {
      const holidays = db.holidays || [];
      durationDays = calculateDays(start_date, end_date, leaveType.count_mode, holidays);
    }

    if (durationDays === 0) {
      return res.status(400).json({ error: 'วันที่เลือกตรงกับวันหยุดทั้งหมด (ไม่นับเป็นวันลา)' });
    }

    // Emergency check: start_date is today
    const today = getTodayString();
    const isEmergency = start_date === today;

    // Notice days check
    if (leaveType.min_notice_days > 0 && !isEmergency) {
      const noticeDays = calculateDays(today, start_date) - 1;
      if (noticeDays < leaveType.min_notice_days) {
        return res.status(400).json({ error: `การลาประเภทนี้ต้องแจ้งล่วงหน้าอย่างน้อย ${leaveType.min_notice_days} วัน` });
      }
    }

    // Balance check
    const reqYear = new Date(start_date).getFullYear();
    const balance = db.leave_balances.find(b => b.doctor_id === doctor_id && b.leave_type_id === leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      const total = Number(balance.entitlement_days) + Number(balance.carried_over_days);
      const remaining = total - Number(balance.used_days) - Number(balance.pending_days);
      if (remaining < durationDays) {
        return res.status(400).json({ error: `วันลาคงเหลือไม่พอ (คงเหลือ ${remaining} วัน แต่ต้องการลา ${durationDays} วัน)` });
      }
    }

    // Quota check
    const dept = db.departments.find(d => d.id === doc.department_id);
    let isException = false;
    let quotaInfo = null;

    if (dept) {
      const onLeaveCount = db.leave_requests.filter(r => {
        if (r.status !== 'APPROVED' && r.status !== 'PENDING') return false;
        const d = db.doctors.find(item => item.id === r.doctor_id);
        return d && d.department_id === dept.id && (start_date >= r.start_date && start_date <= r.end_date);
      }).length;

      isException = onLeaveCount >= dept.max_leave_per_day;
      quotaInfo = {
        dept_name: dept.name_th,
        max_allowed: dept.max_leave_per_day,
        current_on_leave: onLeaveCount,
        is_quota_exceeded: isException
      };
    }

    // Generate Request Number (Format: LV-YYYY-NNNNN)
    const currentYear = new Date().getFullYear();
    const countThisYear = db.leave_requests.filter(r => r.request_no && r.request_no.includes(`LV-${currentYear}`)).length + 1;
    const requestNo = `LV-${currentYear}-${String(countThisYear).padStart(5, '0')}`;

    const newRequest = {
      id: uuidv4(),
      request_no: requestNo,
      doctor_id,
      leave_type_id,
      start_date,
      end_date,
      duration_days: durationDays,
      half_day_type,
      reason,
      is_emergency: isEmergency,
      is_exception: isException,
      upload_later: upload_later === 'true' || upload_later === true,
      status: 'PENDING',
      current_step: 1,
      total_steps: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save attachments if uploaded
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => {
        db.leave_attachments.push({
          id: uuidv4(),
          request_id: newRequest.id,
          file_name: f.originalname,
          storage_path: `/uploads/${f.filename}`,
          file_size_bytes: f.size,
          mime_type: f.mimetype,
          uploaded_at: new Date().toISOString()
        });
      });
    }

    // Sync Balance: increment pending_days
    const reqYear = new Date(start_date).getFullYear();
    let balance = db.leave_balances.find(b => b.doctor_id === doctor_id && b.leave_type_id === leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      balance.pending_days = Number(balance.pending_days) + durationDays;
      balance.updated_at = new Date().toISOString();
    } else {
      // Create empty balance record if not existing
      balance = {
        id: uuidv4(),
        doctor_id,
        leave_type_id,
        fiscal_year: reqYear,
        entitlement_days: 0,
        carried_over_days: 0,
        used_days: 0,
        pending_days: durationDays,
        updated_at: new Date().toISOString()
      };
      db.leave_balances.push(balance);
    }

    db.leave_requests.push(newRequest);

    // Audit Log
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: newRequest.id,
      action: 'INSERT',
      actor_id: doctor_id,
      new_data: { request_no: requestNo, status: 'PENDING', is_emergency: isEmergency, is_exception: isException },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // -------------------------------------------------------------
    // LINE NOTIFICATIONS (1-on-1 Flex Messages)
    // -------------------------------------------------------------
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    // 1. Send confirmation to Doctor
    if (doc.line_user_id) {
      const docFlex = buildDoctorSubmittedFlex(newRequest, doc, leaveType);
      await sendLinePushMessage(doc.line_user_id, docFlex);
    }

    // 2. Find Approver and send 1-on-1 Flex Message
    const route = db.approval_routes.find(r => r.doctor_id === doctor_id && r.step_order === 1);
    const defaultApproverId = 'c0000000-0000-0000-0000-000000000002'; // Dr. Paravee default
    const approverId = route ? route.approver_id : defaultApproverId; 
    const approver = db.doctors.find(d => d.id === approverId);

    if (approver && approver.line_user_id) {
      const approverFlex = buildApproverRequestFlex(newRequest, doc, leaveType, quotaInfo, appUrl);
      await sendLinePushMessage(approver.line_user_id, approverFlex);
    }

    // 3. If Emergency: Send immediate Urgent alert to P'Koong (Medical Admin)
    if (isEmergency) {
      const koong = db.doctors.find(d => d.employee_id === 'EMP-KOONG');
      if (koong && koong.line_user_id) {
        const emergFlex = buildEmergencyAlertFlex(newRequest, doc, leaveType, koong.phone);
        await sendLinePushMessage(koong.line_user_id, emergFlex);
      }
    }

    res.status(201).json({
      message: 'ยื่นใบลาสำเร็จ ระบบส่งแจ้งเตือนเข้า LINE เรียบร้อยแล้ว',
      request: newRequest,
      quota_warning: isException ? 'คำขอของท่านเกินโควตาประจำวันของแผนก และถูกบันทึกเป็นคำขอข้อยกเว้นพิเศษ' : null,
      is_emergency: isEmergency
    });
  } catch (err) {
    console.error('Leave submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CANCEL LEAVE REQUEST
// -------------------------------------------------------------
router.post('/leave-requests/:id/cancel', async (req, res) => {
  try {
    const db = getDb();
    const request = db.leave_requests.find(r => r.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { doctor_id, reason } = req.body;
    
    // Basic check - only the doctor who created it can cancel it
    if (request.doctor_id !== doctor_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Only allow canceling if PENDING
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'สามารถยกเลิกได้เฉพาะคำขอที่กำลังรออนุมัติเท่านั้น' });
    }

    // Restore balance if it's deducted from quota
    const leaveType = db.leave_types.find(lt => lt.id === request.leave_type_id);
    if (leaveType && leaveType.deducts_from_quota) {
      const currentYear = new Date().getFullYear();
      const balance = db.leave_balances.find(b => 
        b.doctor_id === request.doctor_id && 
        b.leave_type_id === leaveType.id && 
        b.fiscal_year === currentYear
      );
      if (balance) {
        balance.pending_days -= request.duration_days;
        if (balance.pending_days < 0) balance.pending_days = 0;
      }
    }

    request.status = 'CANCELLED';
    
    const log = {
      id: uuidv4(),
      request_id: request.id,
      step_order: request.current_step,
      action: 'CANCEL',
      approver_id: doctor_id,
      comments: reason || 'แพทย์ยกเลิกคำขอด้วยตนเอง',
      acted_at: new Date().toISOString()
    };
    db.approval_logs.push(log);

    saveStore();

    // Send Cancel Notification to Approver
    const doc = db.doctors.find(d => d.id === doctor_id);
    const route = db.approval_routes.find(r => r.doctor_id === doctor_id && r.step_order === 1);
    const defaultApproverId = 'c0000000-0000-0000-0000-000000000002'; // Dr. Paravee default
    const approverId = route ? route.approver_id : defaultApproverId; 
    const approver = db.doctors.find(d => d.id === approverId);

    if (approver && approver.line_user_id) {
      const flex = buildCancelAlertFlex(request, doc, leaveType);
      await sendLinePushMessage(approver.line_user_id, flex);
    }

    res.json({ success: true, message: 'ยกเลิกคำขอลาเรียบร้อยแล้ว', request });
  } catch (err) {
    console.error('Cancel Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------------------------------------------------
// APPROVAL ACTIONS
// -------------------------------------------------------------
router.post('/leave-requests/:id/approve', async (req, res) => {
  try {
    const db = getDb();
    const reqItem = db.leave_requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

    if (reqItem.status === 'APPROVED') {
      return res.status(400).json({ error: 'ใบลาได้รับการอนุมัติแล้ว' });
    }

    const { approver_id, comments = '' } = req.body;
    const actorId = approver_id || 'c0000000-0000-0000-0000-000000000002'; // default Dr. Paravee
    const approver = db.doctors.find(d => d.id === actorId);

    // Update Request status
    reqItem.status = 'APPROVED';
    reqItem.updated_at = new Date().toISOString();

    // Sync Balance: pending -> used
    const reqYear = new Date(reqItem.start_date).getFullYear();
    const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
      balance.used_days = Number(balance.used_days) + Number(reqItem.duration_days);
      balance.updated_at = new Date().toISOString();
    }

    // Add Approval Log
    db.approval_logs.push({
      id: uuidv4(),
      request_id: reqItem.id,
      step_order: reqItem.current_step,
      approver_id: actorId,
      action: 'APPROVED',
      comments,
      acted_at: new Date().toISOString()
    });

    // Add Audit Log
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: reqItem.id,
      action: 'UPDATE',
      actor_id: actorId,
      new_data: { status: 'APPROVED', approver_id: actorId, comments },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // Send 1-on-1 Flex Message to Doctor
    const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
    const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
    if (doc && doc.line_user_id) {
      const decisionFlex = buildLeaveDecisionFlex(
        reqItem,
        doc,
        leaveType,
        'APPROVED',
        approver ? `${approver.prefix_th}${approver.first_name_th} ${approver.last_name_th}` : 'หัวหน้าแผนก',
        comments
      );
      await sendLinePushMessage(doc.line_user_id, decisionFlex);
    }

    res.json({ message: 'อนุมัติใบลาสำเร็จ', request: reqItem });
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/leave-requests/:id/reject', async (req, res) => {
  try {
    const db = getDb();
    const reqItem = db.leave_requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

    const { approver_id, comments = 'ติดภารกิจออกตรวจ / ไม่ตรงเงื่อนไข' } = req.body;
    const actorId = approver_id || 'c0000000-0000-0000-0000-000000000002';
    const approver = db.doctors.find(d => d.id === actorId);

    // Update status
    reqItem.status = 'REJECTED';
    reqItem.updated_at = new Date().toISOString();

    // Sync Balance: restore pending
    const reqYear = new Date(reqItem.start_date).getFullYear();
    const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
      balance.updated_at = new Date().toISOString();
    }

    // Add Approval Log
    db.approval_logs.push({
      id: uuidv4(),
      request_id: reqItem.id,
      step_order: reqItem.current_step,
      approver_id: actorId,
      action: 'REJECTED',
      comments,
      acted_at: new Date().toISOString()
    });

    // Add Audit Log
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: reqItem.id,
      action: 'UPDATE',
      actor_id: actorId,
      new_data: { status: 'REJECTED', approver_id: actorId, comments },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // Send 1-on-1 Flex Message to Doctor
    const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
    const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
    if (doc && doc.line_user_id) {
      const decisionFlex = buildLeaveDecisionFlex(
        reqItem,
        doc,
        leaveType,
        'REJECTED',
        approver ? `${approver.prefix_th}${approver.first_name_th} ${approver.last_name_th}` : 'หัวหน้าแผนก',
        comments
      );
      await sendLinePushMessage(doc.line_user_id, decisionFlex);
    }

    res.json({ message: 'บันทึกไม่อนุมัติสำเร็จ', request: reqItem });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/leave-requests/:id/override', async (req, res) => {
  try {
    const db = getDb();
    const reqItem = db.leave_requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

    const { admin_id, reason = 'อนุมัติแทนกรณีฉุกเฉิน/หัวหน้าแผนกติดภารกิจ' } = req.body;
    const actorId = admin_id || 'c0000000-0000-0000-0000-000000000001'; // P'Koong
    const koong = db.doctors.find(d => d.id === actorId);

    reqItem.status = 'APPROVED';
    reqItem.updated_at = new Date().toISOString();

    const reqYear = new Date(reqItem.start_date).getFullYear();
    const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
      balance.used_days = Number(balance.used_days) + Number(reqItem.duration_days);
      balance.updated_at = new Date().toISOString();
    }

    db.approval_logs.push({
      id: uuidv4(),
      request_id: reqItem.id,
      step_order: reqItem.current_step,
      approver_id: actorId,
      action: 'OVERRIDDEN',
      comments: `[Override โดยพี่กุ้ง ฝ่ายการแพทย์]: ${reason}`,
      acted_at: new Date().toISOString()
    });

    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: reqItem.id,
      action: 'OVERRIDE_APPROVE',
      actor_id: actorId,
      new_data: { status: 'APPROVED', action: 'OVERRIDDEN', reason },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    // Send 1-on-1 Flex Message to Doctor
    const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
    const leaveType = db.leave_types.find(lt => lt.id === reqItem.leave_type_id);
    if (doc && doc.line_user_id) {
      const decisionFlex = buildLeaveDecisionFlex(
        reqItem,
        doc,
        leaveType,
        'APPROVED',
        'คุณสิริมาศ (พี่กุ้ง) อนุมัติแทน',
        `อนุมัติแทนกรณีฉุกเฉิน: ${reason}`
      );
      await sendLinePushMessage(doc.line_user_id, decisionFlex);
    }

    res.json({ message: 'อนุมัติแทน (Override) สำเร็จ', request: reqItem });
  } catch (err) {
    console.error('Override error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/leave-requests/:id/cancel', async (req, res) => {
  try {
    const db = getDb();
    const reqItem = db.leave_requests.find(r => r.id === req.params.id);
    if (!reqItem) return res.status(404).json({ error: 'Leave request not found' });

    const { doctor_id, reason = 'ขอยกเลิกคำขอ' } = req.body;
    const prevStatus = reqItem.status;

    reqItem.status = 'CANCELLED';
    reqItem.cancelled_at = new Date().toISOString();
    reqItem.cancelled_reason = reason;
    reqItem.updated_at = new Date().toISOString();

    const reqYear = new Date(reqItem.start_date).getFullYear();
    const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
    if (balance) {
      if (prevStatus === 'PENDING') {
        balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
      } else if (prevStatus === 'APPROVED') {
        balance.used_days = Math.max(0, Number(balance.used_days) - Number(reqItem.duration_days));
      }
      balance.updated_at = new Date().toISOString();
    }

    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'leave_requests',
      record_id: reqItem.id,
      action: 'CANCEL',
      actor_id: doctor_id || reqItem.doctor_id,
      new_data: { status: 'CANCELLED', reason },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveStore();

    res.json({ message: 'ยกเลิกใบลาสำเร็จและคืนสิทธิ์เรียบร้อยแล้ว', request: reqItem });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD STATS (P'Koong Medical Admin)
// -------------------------------------------------------------
router.get('/stats/dashboard', (req, res) => {
  const db = getDb();
  const today = getTodayString();

  const pendingRequests = db.leave_requests.filter(r => r.status === 'PENDING');
  const emergencyRequestsToday = db.leave_requests.filter(r => r.is_emergency && r.start_date === today);
  
  const onLeaveToday = db.leave_requests.filter(r => {
    return (r.status === 'APPROVED' || r.status === 'PENDING') && today >= r.start_date && today <= r.end_date;
  });

  const departmentStats = db.departments.map(dept => {
    const deptDoctors = db.doctors.filter(d => d.department_id === dept.id);
    const onLeave = onLeaveToday.filter(r => {
      const doc = db.doctors.find(d => d.id === r.doctor_id);
      return doc && doc.department_id === dept.id;
    });

    return {
      department_id: dept.id,
      code: dept.code,
      name_th: dept.name_th,
      doctor_count: deptDoctors.length,
      max_leave_per_day: dept.max_leave_per_day,
      min_staff_required: dept.min_staff_required,
      on_leave_today_count: onLeave.length,
      is_quota_full: onLeave.length >= dept.max_leave_per_day
    };
  });

  res.json({
    pending_count: pendingRequests.length,
    emergency_today_count: emergencyRequestsToday.length,
    on_leave_today_count: onLeaveToday.length,
    departments: departmentStats,
    emergency_leaves: emergencyRequestsToday.map(r => {
      const doc = db.doctors.find(d => d.id === r.doctor_id);
      const lt = db.leave_types.find(t => t.id === r.leave_type_id);
      return {
        ...r,
        doctor_name: doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : '',
        doctor_phone: doc ? doc.phone : '',
        leave_type_name: lt ? lt.name_th : ''
      };
    })
  });
});

// -------------------------------------------------------------
// LINE WEBHOOK & SIMULATOR
// -------------------------------------------------------------
router.post('/line/webhook', async (req, res) => {
  try {
    const events = req.body.events || [];
    const db = getDb();

    for (const event of events) {
      if (event.type === 'postback') {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get('action');
        const requestId = params.get('id');

        if (action === 'approve' && requestId) {
          const reqItem = db.leave_requests.find(r => r.id === requestId);
          if (reqItem && reqItem.status === 'PENDING') {
            reqItem.status = 'APPROVED';
            reqItem.updated_at = new Date().toISOString();

            const reqYear = new Date(reqItem.start_date).getFullYear();
            const balance = db.leave_balances.find(b => b.doctor_id === reqItem.doctor_id && b.leave_type_id === reqItem.leave_type_id && b.fiscal_year === reqYear);
            if (balance) {
              balance.pending_days = Math.max(0, Number(balance.pending_days) - Number(reqItem.duration_days));
              balance.used_days = Number(balance.used_days) + Number(reqItem.duration_days);
              balance.updated_at = new Date().toISOString();
            }

            // Get dynamic approver from LINE userId
            const lineUserId = event.source && event.source.userId;
            let approver = null;
            if (lineUserId) {
              approver = db.doctors.find(d => d.line_user_id === lineUserId);
            }
            if (!approver) {
              approver = db.doctors.find(d => d.id === 'c0000000-0000-0000-0000-000000000002');
            }
            const approverName = approver ? `${approver.prefix_th}${approver.first_name_th} ${approver.last_name_th}` : 'นพ.ปารวี ชาญวิทย์';
            const approverId = approver ? approver.id : 'c0000000-0000-0000-0000-000000000002';

            db.approval_logs.push({
              id: uuidv4(),
              request_id: reqItem.id,
              step_order: 1,
              approver_id: approverId,
              action: 'APPROVED',
              comments: 'อนุมัติผ่าน LINE 1-Click Postback',
              acted_at: new Date().toISOString()
            });

            saveStore();

            // Notify Doctor via LINE
            const doc = db.doctors.find(d => d.id === reqItem.doctor_id);
            const lt = db.leave_types.find(t => t.id === reqItem.leave_type_id);
            if (doc && doc.line_user_id) {
              const flex = buildLeaveDecisionFlex(reqItem, doc, lt, 'APPROVED', approverName, 'อนุมัติผ่าน LINE 1-Click');
              await sendLinePushMessage(doc.line_user_id, flex);
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send(err.message);
  }
});

router.get('/line/simulator/messages', (req, res) => {
  res.json(simulatedLineMessages);
});

router.post('/line/simulator/clear', (req, res) => {
  simulatedLineMessages.length = 0;
  res.json({ message: 'Cleared simulated messages' });
});

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------
router.get('/audit-logs', (req, res) => {
  const db = getDb();
  const sorted = [...db.audit_logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const enriched = sorted.map(log => {
    const actor = db.doctors.find(d => d.id === log.actor_id);
    return {
      ...log,
      actor_name: actor ? `${actor.prefix_th}${actor.first_name_th} ${actor.last_name_th}` : 'System'
    };
  });

  res.json(enriched.slice(0, 100));
});

export default router;
