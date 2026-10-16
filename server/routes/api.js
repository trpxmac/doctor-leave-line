import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  getDb,
  saveStore,
  resetStore,
  isSupabaseConfigured,
  supabase
} from '../db.js';
import {
  sendLinePushMessage,
  sendLineReplyMessage,
  buildDoctorSubmittedFlex,
  buildApproverRequestFlex,
  buildLeaveDecisionFlex,
  buildEmergencyAlertFlex,
  buildCancelAlertFlex,
  buildWelcomeFlex,
  buildContactCardFlex,
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

// Search doctors by name or phone or employeeId for Onboarding
router.get('/auth/search-doctors', (req, res) => {
  const db = getDb();
  const query = (req.query.query || '').trim().toLowerCase();
  
  const cleanQuery = query.replace(/[^0-9]/g, '');

  let filtered = db.doctors;
  if (query) {
    filtered = db.doctors.filter(d => {
      const fullName = `${d.prefix_th || ''}${d.first_name_th || ''} ${d.last_name_th || ''}`.toLowerCase();
      const empId = (d.employee_id || '').toLowerCase();
      const phone = (d.phone || '').replace(/[^0-9]/g, '');

      return (
        fullName.includes(query) ||
        empId.includes(query) ||
        (cleanQuery.length >= 3 && phone.includes(cleanQuery))
      );
    });
  }

  const results = filtered.map(d => {
    const dept = db.departments.find(dept => dept.id === d.department_id);
    return {
      id: d.id,
      employee_id: d.employee_id,
      prefix_th: d.prefix_th,
      first_name_th: d.first_name_th,
      last_name_th: d.last_name_th,
      doctor_type: d.doctor_type,
      department_name: dept?.name_th || 'ไม่ระบุแผนก',
      phone: d.phone,
      phone_masked: d.phone ? d.phone.replace(/(\d{3})\d{3}(\d{4})/, '$1-xxx-$2') : '-',
      is_linked: !!d.line_user_id,
      line_user_id: d.line_user_id,
      line_display_name: d.line_display_name,
      avatar: d.avatar
    };
  });

  res.json({ doctors: results });
});

router.post('/auth/link', (req, res) => {
  const db = getDb();
  const { lineUserId, doctorId, employeeId, lineDisplayName, linePictureUrl } = req.body;
  if (!lineUserId) {
    return res.status(400).json({ error: 'lineUserId is required' });
  }

  let doctor = null;
  if (doctorId) {
    doctor = db.doctors.find(d => d.id === doctorId);
  } else if (employeeId) {
    doctor = db.doctors.find(d => d.employee_id === employeeId);
  }

  if (!doctor) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลแพทย์ในระบบ' });
  }

  if (doctor.line_user_id && doctor.line_user_id !== lineUserId) {
    return res.status(400).json({ error: 'บัญชีแพทย์ท่านนี้ได้ผูกกับ LINE อื่นไปแล้ว หากต้องการเปลี่ยนกรุณาติดต่อฝ่ายการแพทย์' });
  }

  doctor.line_user_id = lineUserId;
  if (lineDisplayName) doctor.line_display_name = lineDisplayName;
  if (linePictureUrl && !doctor.avatar) doctor.avatar = linePictureUrl;
  
  saveStore();

  if (db.audit_logs) {
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'doctors',
      record_id: doctor.id,
      action: 'UPDATE',
      actor_id: doctor.id,
      new_data: { line_user_id: lineUserId, line_display_name: lineDisplayName },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });
  }

  res.json({ success: true, doctor });
});

// Admin unlink doctor LINE
router.post('/doctors/:id/unlink-line', (req, res) => {
  const db = getDb();
  const doctor = db.doctors.find(d => d.id === req.params.id);
  if (!doctor) return res.status(404).json({ error: 'ไม่พบแพทย์' });

  const prevLineId = doctor.line_user_id;
  doctor.line_user_id = null;
  doctor.line_display_name = null;
  saveStore();

  if (db.audit_logs) {
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'doctors',
      record_id: doctor.id,
      action: 'UPDATE',
      actor_id: req.body.actor_id || null,
      old_data: { line_user_id: prevLineId },
      new_data: { line_user_id: null },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });
  }

  res.json({ success: true, message: 'ยกเลิกการผูกบัญชี LINE เรียบร้อย' });
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
// -------------------------------------------------------------
// LEAVE TYPES (PHASE 4 - ITEM 25)
// -------------------------------------------------------------
router.get('/leave-types', (req, res) => {
  const db = getDb();
  const { doctorType, includeAll } = req.query;
  
  let types = includeAll === 'true' ? [...db.leave_types] : db.leave_types.filter(t => t.is_active);
  if (doctorType === 'PART_TIME') {
    types = types.filter(t => !t.is_full_time_only);
  }

  res.json(types.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
});

// POST /api/leave-types - Add new leave type
router.post('/leave-types', (req, res) => {
  const db = getDb();
  const {
    code,
    name_th,
    name_en,
    count_mode = 'WORKING_DAYS',
    allows_half_day = true,
    requires_attachment = false,
    attachment_threshold_days = 2.0,
    min_notice_days = 0,
    max_days_per_request,
    allows_backdate = false,
    is_full_time_only = false,
    color = '#006699',
    sort_order,
    actor_id
  } = req.body;

  if (!code || !name_th) {
    return res.status(400).json({ error: 'กรุณาระบุรหัสและชื่อประเภทการลา' });
  }

  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (db.leave_types.some(lt => lt.code === cleanCode)) {
    return res.status(400).json({ error: `รหัสประเภทการลา '${cleanCode}' มีอยู่แล้วในระบบ` });
  }

  const newType = {
    id: uuidv4(),
    code: cleanCode,
    name_th: name_th.trim(),
    name_en: (name_en || '').trim(),
    count_mode: count_mode === 'CALENDAR_DAYS' ? 'CALENDAR_DAYS' : 'WORKING_DAYS',
    allows_half_day: Boolean(allows_half_day),
    requires_attachment: Boolean(requires_attachment),
    attachment_threshold_days: Number(attachment_threshold_days) || 0,
    min_notice_days: Number(min_notice_days) || 0,
    max_days_per_request: max_days_per_request ? Number(max_days_per_request) : null,
    allows_backdate: Boolean(allows_backdate),
    is_full_time_only: Boolean(is_full_time_only),
    color: color || '#006699',
    sort_order: Number(sort_order) || (db.leave_types.length + 1),
    is_active: true
  };

  db.leave_types.push(newType);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'leave_types',
    record_id: newType.id,
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: newType,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.status(201).json(newType);
});

// PUT /api/leave-types/:id - Update leave type
router.put('/leave-types/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = db.leave_types.findIndex(lt => lt.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบประเภทการลาที่ระบุ' });
  }

  const oldData = { ...db.leave_types[index] };
  const updates = req.body;

  if (updates.name_th) db.leave_types[index].name_th = updates.name_th.trim();
  if (updates.name_en !== undefined) db.leave_types[index].name_en = updates.name_en.trim();
  if (updates.count_mode) db.leave_types[index].count_mode = updates.count_mode;
  if (updates.allows_half_day !== undefined) db.leave_types[index].allows_half_day = Boolean(updates.allows_half_day);
  if (updates.requires_attachment !== undefined) db.leave_types[index].requires_attachment = Boolean(updates.requires_attachment);
  if (updates.attachment_threshold_days !== undefined) db.leave_types[index].attachment_threshold_days = Number(updates.attachment_threshold_days);
  if (updates.min_notice_days !== undefined) db.leave_types[index].min_notice_days = Number(updates.min_notice_days);
  if (updates.allows_backdate !== undefined) db.leave_types[index].allows_backdate = Boolean(updates.allows_backdate);
  if (updates.is_full_time_only !== undefined) db.leave_types[index].is_full_time_only = Boolean(updates.is_full_time_only);
  if (updates.color) db.leave_types[index].color = updates.color;
  if (updates.is_active !== undefined) db.leave_types[index].is_active = Boolean(updates.is_active);
  if (updates.sort_order !== undefined) db.leave_types[index].sort_order = Number(updates.sort_order);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'leave_types',
    record_id: id,
    action: 'UPDATE',
    actor_id: updates.actor_id || null,
    old_data: oldData,
    new_data: db.leave_types[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json(db.leave_types[index]);
});

// DELETE /api/leave-types/:id - Delete or disable
router.delete('/leave-types/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = db.leave_types.findIndex(lt => lt.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบประเภทการลาที่ระบุ' });
  }

  const hasRequests = (db.leave_requests || []).some(lr => lr.leave_type_id === id);
  if (hasRequests) {
    db.leave_types[index].is_active = false;
    saveStore();
    return res.json({ message: 'ปิดการใช้งานประเภทการลาเรียบร้อย (มีประวัติการลาในระบบ)', softDeleted: true });
  }

  const deleted = db.leave_types[index];
  db.leave_types.splice(index, 1);
  saveStore();
  res.json({ message: 'ลบประเภทการลาสำเร็จ', id });
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
    const subDoc = reqItem.substitute_doctor_id ? db.doctors.find(d => d.id === reqItem.substitute_doctor_id) : null;
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
      substitute_doctor: subDoc ? {
        id: subDoc.id,
        employee_id: subDoc.employee_id,
        name: `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`,
        avatar: subDoc.avatar,
        phone: subDoc.phone
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
  const subDoc = reqItem.substitute_doctor_id ? db.doctors.find(d => d.id === reqItem.substitute_doctor_id) : null;
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
    substitute_doctor: subDoc ? {
      id: subDoc.id,
      employee_id: subDoc.employee_id,
      name: `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`,
      avatar: subDoc.avatar,
      phone: subDoc.phone
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
      submitted_by_admin = 'false',
      substitute_doctor_id = null,
      duty_handover_notes = ''
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
    let reqYear = new Date(start_date).getFullYear();
    let balanceRecord = db.leave_balances.find(b => b.doctor_id === doctor_id && b.leave_type_id === leave_type_id && b.fiscal_year === reqYear);
    if (balanceRecord) {
      const total = Number(balanceRecord.entitlement_days) + Number(balanceRecord.carried_over_days);
      const remaining = total - Number(balanceRecord.used_days) - Number(balanceRecord.pending_days);
      if (remaining < durationDays) {
        return res.status(400).json({ error: `วันลาคงเหลือไม่พอ (คงเหลือ ${remaining} วัน แต่ต้องการลา ${durationDays} วัน)` });
      }
    }

    // Quota check
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

    // Shift Collision Check (Feature #26)
    const conflictingShifts = (db.doctor_shifts || []).filter(s =>
      s.doctor_id === doctor_id &&
      s.status === 'SCHEDULED' &&
      s.shift_date >= start_date &&
      s.shift_date <= end_date
    );
    const hasShiftConflict = conflictingShifts.length > 0;
    let substituteDoctorName = null;
    if (substitute_doctor_id) {
      const subDoc = db.doctors.find(d => d.id === substitute_doctor_id);
      if (subDoc) {
        substituteDoctorName = `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`;
      }
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
      substitute_doctor_id: substitute_doctor_id || null,
      substitute_doctor_name: substituteDoctorName,
      duty_handover_notes: duty_handover_notes ? duty_handover_notes.trim() : null,
      has_shift_conflict: hasShiftConflict,
      status: 'PENDING',
      current_step: 1,
      total_steps: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Automatically cover conflicting shifts if substitute doctor provided
    if (hasShiftConflict && substitute_doctor_id) {
      conflictingShifts.forEach(shift => {
        shift.status = 'COVERED';
        shift.substitute_doctor_id = substitute_doctor_id;
        shift.leave_request_id = newRequest.id;
        shift.notes = `${shift.notes ? shift.notes + ' | ' : ''}มีผู้ปฏิบัติหน้าที่แทนเนื่องจากลา (${requestNo})`;
      });
    }

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
    if (balanceRecord) {
      balanceRecord.pending_days = Number(balanceRecord.pending_days) + durationDays;
      balanceRecord.updated_at = new Date().toISOString();
    } else {
      // Create empty balance record if not existing
      balanceRecord = {
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
      db.leave_balances.push(balanceRecord);
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

    let lineQuotaError = false;

    // 2. Find Approver and send 1-on-1 Flex Message
    const route = db.approval_routes.find(r => r.doctor_id === doctor_id && r.step_order === 1);
    const defaultApproverId = 'c0000000-0000-0000-0000-000000000002'; // Dr. Paravee default
    const approverId = route ? route.approver_id : defaultApproverId; 
    const approver = db.doctors.find(d => d.id === approverId);

    if (approver && approver.line_user_id) {
      const approverFlex = buildApproverRequestFlex(newRequest, doc, leaveType, quotaInfo, appUrl);
      const resPush = await sendLinePushMessage(approver.line_user_id, approverFlex);
      if (resPush.isQuotaError) {
        lineQuotaError = true;
      }
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
      is_emergency: isEmergency,
      line_quota_error: lineQuotaError
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
      comments: `[Override โดยฝ่ายการแพทย์]: ${reason}`,
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
      const coordinator = db.contact_settings?.coordinator_name || 'เจ้าหน้าที่ฝ่ายการแพทย์';
      const decisionFlex = buildLeaveDecisionFlex(
        reqItem,
        doc,
        leaveType,
        'APPROVED',
        `${coordinator} อนุมัติแทน (ฝ่ายการแพทย์)`,
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
    // 1. Verify LINE Signature
    const signature = req.headers['x-line-signature'];
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (channelSecret) {
      if (!signature) {
        console.warn('⚠️ Webhook blocked: Missing X-Line-Signature header');
        return res.status(401).send('Unauthorized: No signature');
      }
      
      const bodyString = req.rawBody || JSON.stringify(req.body);
      const hash = crypto.createHmac('sha256', channelSecret).update(bodyString).digest('base64');
      
      if (hash !== signature) {
        console.warn('⚠️ Webhook blocked: Invalid X-Line-Signature');
        return res.status(401).send('Unauthorized: Invalid signature');
      }
    } else {
      console.warn('⚠️ LINE_CHANNEL_SECRET is missing. Bypassing signature verification (DEV MODE ONLY).');
    }

    const events = req.body.events || [];
    const db = getDb();

    for (const event of events) {
      // 1. Follow Event (Doctor adds bot as friend or unblocks)
      if (event.type === 'follow') {
        const lineUserId = event.source && event.source.userId;
        let doc = null;
        if (lineUserId) {
          doc = db.doctors.find(d => d.line_user_id === lineUserId);
        }
        const docName = doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : '';
        const welcomeFlex = buildWelcomeFlex(docName);
        if (event.replyToken) {
          await sendLineReplyMessage(event.replyToken, welcomeFlex);
        } else if (lineUserId) {
          await sendLinePushMessage(lineUserId, welcomeFlex);
        }
      }

      // 2. Text Message Event (Doctor types keyword or taps Rich Menu)
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        const text = (event.message.text || '').trim();
        const lineUserId = event.source && event.source.userId;
        let doc = null;
        if (lineUserId) {
          doc = db.doctors.find(d => d.line_user_id === lineUserId);
        }

        // A. Contact Medical Affairs / Emergency Hotline Card
        if (
          text.includes('ติดต่อ') ||
          text.includes('ฝ่ายการแพทย์') ||
          text.includes('ฉุกเฉิน') ||
          text.includes('กุ้ง') ||
          text.includes('สายด่วน') ||
          text.includes('เบอร์') ||
          text.includes('โทร')
        ) {
          const contactFlex = buildContactCardFlex(db.contact_settings || defaultContact);
          if (event.replyToken) {
            await sendLineReplyMessage(event.replyToken, contactFlex);
          }
        }
        // B. Welcome / Leave Menu Card
        else if (text.includes('ลา') || text.includes('เมนู') || text.includes('สวัสดี') || text.includes('help')) {
          const docName = doc ? `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}` : '';
          const welcomeFlex = buildWelcomeFlex(docName);
          if (event.replyToken) {
            await sendLineReplyMessage(event.replyToken, welcomeFlex);
          }
        }
      }

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

// -------------------------------------------------------------
// HOLIDAYS MANAGEMENT (PHASE 4)
// -------------------------------------------------------------

// GET /api/holidays - List holidays, optionally filtered by year
router.get('/holidays', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { year, activeOnly } = req.query;
  let list = [...db.holidays];
  
  if (year) {
    list = list.filter(h => h.holiday_date.startsWith(`${year}-`));
  }
  
  if (activeOnly === 'true') {
    list = list.filter(h => h.is_active);
  }
  
  list.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  res.json(list);
});

// POST /api/holidays - Create new holiday
router.post('/holidays', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { holiday_date, name_th, is_active = true, actor_id } = req.body;
  
  if (!holiday_date || !name_th) {
    return res.status(400).json({ error: 'กรุณาระบุวันที่และชื่อวันหยุด' });
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday_date)) {
    return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
  }
  
  const exists = db.holidays.find(h => h.holiday_date === holiday_date);
  if (exists) {
    return res.status(400).json({ error: `วันที่ ${holiday_date} มีในระบบแล้ว (${exists.name_th})` });
  }
  
  const newHoliday = {
    id: uuidv4(),
    holiday_date,
    name_th: name_th.trim(),
    is_active: Boolean(is_active)
  };
  
  db.holidays.push(newHoliday);
  
  // Audit log
  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'holidays',
    record_id: newHoliday.id,
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: newHoliday,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
  
  saveStore();
  res.status(201).json(newHoliday);
});

// PUT /api/holidays/:id - Update holiday
router.put('/holidays/:id', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { id } = req.params;
  const { holiday_date, name_th, is_active, actor_id } = req.body;
  
  const index = db.holidays.findIndex(h => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลวันหยุดที่ระบุ' });
  }
  
  const oldData = { ...db.holidays[index] };
  
  if (holiday_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday_date)) {
      return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
    }
    const duplicate = db.holidays.find(h => h.holiday_date === holiday_date && h.id !== id);
    if (duplicate) {
      return res.status(400).json({ error: `วันที่ ${holiday_date} มีในระบบแล้ว (${duplicate.name_th})` });
    }
    db.holidays[index].holiday_date = holiday_date;
  }
  
  if (name_th !== undefined) {
    db.holidays[index].name_th = name_th.trim();
  }
  
  if (is_active !== undefined) {
    db.holidays[index].is_active = Boolean(is_active);
  }
  
  // Audit log
  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'holidays',
    record_id: id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    old_data: oldData,
    new_data: db.holidays[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
  
  saveStore();
  res.json(db.holidays[index]);
});

// DELETE /api/holidays/:id - Remove holiday
router.delete('/holidays/:id', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const { id } = req.params;
  const index = db.holidays.findIndex(h => h.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลวันหยุดที่ระบุ' });
  }
  
  const deletedItem = db.holidays[index];
  db.holidays.splice(index, 1);
  
  // Audit log
  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'holidays',
    record_id: id,
    action: 'DELETE',
    actor_id: req.body?.actor_id || null,
    old_data: deletedItem,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
  
  saveStore();
  res.json({ message: 'ลบข้อมูลวันหยุดสำเร็จ', id });
});

// POST /api/holidays/seed-year - Seed standard Thai holidays for a given year
router.post('/holidays/seed-year', (req, res) => {
  const db = getDb();
  if (!db.holidays) db.holidays = [];
  
  const targetYear = parseInt(req.body.year, 10) || new Date().getFullYear();
  
  const standardHolidays = [
    { date: `${targetYear}-01-01`, name: 'วันขึ้นปีใหม่' },
    { date: `${targetYear}-02-24`, name: 'วันมาฆบูชา' },
    { date: `${targetYear}-04-06`, name: 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (วันจักรี)' },
    { date: `${targetYear}-04-13`, name: 'วันสงกรานต์' },
    { date: `${targetYear}-04-14`, name: 'วันสงกรานต์' },
    { date: `${targetYear}-04-15`, name: 'วันสงกรานต์' },
    { date: `${targetYear}-05-01`, name: 'วันแรงงานแห่งชาติ' },
    { date: `${targetYear}-05-04`, name: 'วันฉัตรมงคล' },
    { date: `${targetYear}-05-22`, name: 'วันวิสาขบูชา' },
    { date: `${targetYear}-06-03`, name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี' },
    { date: `${targetYear}-07-20`, name: 'วันอาสาฬหบูชา' },
    { date: `${targetYear}-07-21`, name: 'วันเข้าพรรษา' },
    { date: `${targetYear}-07-28`, name: 'วันพระบรมราชสมภพพระบาทสมเด็จพระวชิรเกล้าเจ้าอยู่หัว (ร.10)' },
    { date: `${targetYear}-08-12`, name: 'วันแม่แห่งชาติ (วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง)' },
    { date: `${targetYear}-10-13`, name: 'วันนวมินทรมหาราช (วันคล้ายวันสวรรคต ร.9)' },
    { date: `${targetYear}-10-23`, name: 'วันปิยมหาราช' },
    { date: `${targetYear}-12-05`, name: 'วันพ่อแห่งชาติ (วันคล้ายวันพระบรมราชสมภพ ร.9)' },
    { date: `${targetYear}-12-10`, name: 'วันรัฐธรรมนูญ' },
    { date: `${targetYear}-12-31`, name: 'วันสิ้นปี' }
  ];
  
  let addedCount = 0;
  for (const item of standardHolidays) {
    const exists = db.holidays.some(h => h.holiday_date === item.date);
    if (!exists) {
      db.holidays.push({
        id: uuidv4(),
        holiday_date: item.date,
        name_th: item.name,
        is_active: true
      });
      addedCount++;
    }
  }
  
  if (addedCount > 0) {
    db.audit_logs.push({
      id: uuidv4(),
      table_name: 'holidays',
      record_id: 'batch-seed',
      action: 'INSERT',
      actor_id: req.body?.actor_id || null,
      new_data: { note: `Imported standard holidays for year ${targetYear}`, addedCount },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });
    saveStore();
  }
  
  res.json({
    message: `เพิ่มวันหยุดมาตรฐานประจำปี ${targetYear} สำเร็จ (${addedCount} วันใหม่)`,
    addedCount,
    total: db.holidays.filter(h => h.holiday_date.startsWith(`${targetYear}-`)).length
  });
});

// POST /api/calculate-duration - Preview duration calculation with holidays breakdown
router.post('/calculate-duration', (req, res) => {
  const db = getDb();
  const { start_date, end_date, half_day_type, leave_type_id } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'กรุณาระบุวันเริ่มต้นและสิ้นสุด' });
  }

  const leaveType = db.leave_types.find(lt => lt.id === leave_type_id);
  const countMode = leaveType ? leaveType.count_mode : 'CALENDAR_DAYS';
  const holidays = (db.holidays || []).filter(h => h.is_active);

  if (half_day_type === 'MORNING' || half_day_type === 'AFTERNOON') {
    return res.json({
      duration_days: 0.5,
      count_mode: countMode,
      holidays_in_range: []
    });
  }

  const duration_days = calculateDays(start_date, end_date, countMode, holidays);

  // Find holidays that fall within this range
  const holidaySet = new Set(holidays.map(h => h.holiday_date));
  const holidaysInRange = [];
  const start = new Date(start_date);
  const end = new Date(end_date);
  const current = new Date(start);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const date = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;

    if (holidaySet.has(dateStr)) {
      const hObj = holidays.find(h => h.holiday_date === dateStr);
      holidaysInRange.push(hObj);
    }
    current.setDate(current.getDate() + 1);
  }

  res.json({
    duration_days,
    count_mode: countMode,
    holidays_in_range: holidaysInRange
  });
});

// -------------------------------------------------------------
// TENURE LEAVE CALCULATION (PHASE 4 - ITEM 22)
// -------------------------------------------------------------

function calculateTenure(hireDateStr, asOfDate = new Date()) {
  if (!hireDateStr) return { years: 0, months: 0, days: 0, formatted: 'ไม่ระบุวันเริ่มงาน' };
  const hire = new Date(hireDateStr);
  const target = new Date(asOfDate);
  if (hire > target) return { years: 0, months: 0, days: 0, formatted: '0 เดือน (เริ่มงานในอนาคต)' };

  let years = target.getFullYear() - hire.getFullYear();
  let months = target.getMonth() - hire.getMonth();
  let days = target.getDate() - hire.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let formatted = '';
  if (years > 0) formatted += `${years} ปี `;
  formatted += `${months} เดือน`;
  if (years === 0 && months === 0) formatted = `${days} วัน`;

  return { years, months, days, formatted: formatted.trim() };
}

function calculateVacationEntitlement(doctor, tenure, rules, targetYear, settings) {
  if (doctor.doctor_type === 'PART_TIME' && !settings?.allow_part_time) {
    return { entitlement: 0, rule_applied: 'แพทย์พาร์ทไทม์ (ไม่มีสิทธิ์ลาพักผ่อน)' };
  }

  const sortedRules = [...rules].sort((a, b) => a.min_years - b.min_years);
  const matchedRule = sortedRules.find(r => tenure.years >= r.min_years && tenure.years < r.max_years)
    || sortedRules[sortedRules.length - 1];

  if (!matchedRule) {
    return { entitlement: 6.0, rule_applied: 'เกณฑ์เริ่มต้นมาตรฐาน 6 วัน' };
  }

  // First year prorated calculation
  if (matchedRule.min_years === 0 && matchedRule.prorate_monthly > 0) {
    const hire = new Date(doctor.hire_date);
    if (hire.getFullYear() === targetYear) {
      const workedMonths = Math.max(1, 12 - hire.getMonth());
      const prorated = Math.min(matchedRule.entitlement_days, Math.round(workedMonths * matchedRule.prorate_monthly * 2) / 2);
      return {
        entitlement: prorated,
        rule_applied: `ปีแรก สะสมตามสัดส่วน ${workedMonths} เดือน (${prorated} วัน)`
      };
    }
  }

  return {
    entitlement: matchedRule.entitlement_days,
    rule_applied: matchedRule.description
  };
}

// GET /api/tenure/rules - Get tenure rules and settings
router.get('/tenure/rules', (req, res) => {
  const db = getDb();
  res.json({
    rules: db.tenure_rules || [],
    settings: db.tenure_settings || { max_carry_over_days: 5.0, allow_part_time: false }
  });
});

// PUT /api/tenure/rules - Update tenure rules and settings
router.put('/tenure/rules', (req, res) => {
  const db = getDb();
  const { rules, settings, actor_id } = req.body;

  if (rules && Array.isArray(rules)) {
    db.tenure_rules = rules;
  }
  if (settings) {
    db.tenure_settings = { ...db.tenure_settings, ...settings };
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'tenure_rules',
    record_id: 'settings',
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: { rules: db.tenure_rules, settings: db.tenure_settings },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกเกณฑ์การคำนวณอายุงานสำเร็จ', rules: db.tenure_rules, settings: db.tenure_settings });
});

// GET /api/settings/contact - Get Medical Affairs contact settings
router.get('/settings/contact', (req, res) => {
  const db = getDb();
  const defaultContact = {
    department_name: 'ฝ่ายการแพทย์ (Medical Affairs)',
    coordinator_name: 'คุณสิริมาศ',
    phone_emergency: '076-361-888',
    phone_ext: '1234',
    phone_hotline: '081-999-8888',
    email: 'medical_affairs@bsi.hospital',
    location: 'อาคาร A ชั้น 3 ฝ่ายการแพทย์ โรงพยาบาลกรุงเทพศิริโรจน์',
    notify_line: true
  };
  res.json(db.contact_settings || defaultContact);
});

// PUT /api/settings/contact - Update Medical Affairs contact settings
router.put('/settings/contact', (req, res) => {
  const db = getDb();
  const { department_name, coordinator_name, phone_emergency, phone_ext, phone_hotline, email, location, notify_line, actor_id } = req.body;

  db.contact_settings = {
    ...db.contact_settings,
    department_name: department_name || db.contact_settings?.department_name || 'ฝ่ายการแพทย์ (Medical Affairs)',
    coordinator_name: coordinator_name || db.contact_settings?.coordinator_name || 'คุณสิริมาศ',
    phone_emergency: phone_emergency || db.contact_settings?.phone_emergency || '076-361-888',
    phone_ext: phone_ext !== undefined ? phone_ext : (db.contact_settings?.phone_ext || ''),
    phone_hotline: phone_hotline !== undefined ? phone_hotline : (db.contact_settings?.phone_hotline || ''),
    email: email !== undefined ? email : (db.contact_settings?.email || ''),
    location: location !== undefined ? location : (db.contact_settings?.location || ''),
    notify_line: notify_line !== undefined ? notify_line : true
  };

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'contact_settings',
    record_id: 'settings',
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: db.contact_settings,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกข้อมูลติดต่อฝ่ายการแพทย์สำเร็จ', settings: db.contact_settings });
});

// PUT /api/doctors/:id/hire-date - Update doctor's hire date
router.put('/doctors/:id/hire-date', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { hire_date, actor_id } = req.body;

  const doctor = db.doctors.find(d => d.id === id);
  if (!doctor) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลแพทย์' });
  }

  if (!hire_date || !/^\d{4}-\d{2}-\d{2}$/.test(hire_date)) {
    return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
  }

  const oldDate = doctor.hire_date;
  doctor.hire_date = hire_date;

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctors',
    record_id: id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    old_data: { hire_date: oldDate },
    new_data: { hire_date },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกวันเริ่มงานสำเร็จ', doctor });
});

// GET /api/tenure/preview - Preview vacation leave calculation based on tenure for a given year
router.get('/tenure/preview', (req, res) => {
  const db = getDb();
  const targetYear = parseInt(req.query.year, 10) || new Date().getFullYear();
  const rules = db.tenure_rules || [];
  const settings = db.tenure_settings || { max_carry_over_days: 5.0, allow_part_time: false };
  const vacationType = db.leave_types.find(lt => lt.code === 'VACATION') || db.leave_types[0];

  const asOfDate = new Date(`${targetYear}-12-31`);
  const prevYear = targetYear - 1;

  const previewList = db.doctors.map(doctor => {
    const tenure = calculateTenure(doctor.hire_date, asOfDate);
    const { entitlement, rule_applied } = calculateVacationEntitlement(doctor, tenure, rules, targetYear, settings);

    const currentBalance = db.leave_balances.find(
      b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === targetYear
    );

    const prevBalance = db.leave_balances.find(
      b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === prevYear
    );

    let proposedCarryOver = 0;
    if (prevBalance) {
      const remainingPrev = (prevBalance.entitlement_days + prevBalance.carried_over_days) - (prevBalance.used_days + prevBalance.pending_days);
      if (remainingPrev > 0) {
        proposedCarryOver = Math.min(remainingPrev, settings.max_carry_over_days);
      }
    }

    const dept = db.departments.find(d => d.id === doctor.department_id);

    return {
      doctor_id: doctor.id,
      employee_id: doctor.employee_id,
      doctor_name: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`,
      doctor_type: doctor.doctor_type,
      department_name: dept?.name_th || 'ไม่ระบุ',
      hire_date: doctor.hire_date || null,
      tenure,
      calculated_entitlement: entitlement,
      rule_applied,
      current_entitlement: currentBalance ? currentBalance.entitlement_days : null,
      current_carried_over: currentBalance ? currentBalance.carried_over_days : 0,
      proposed_carried_over: proposedCarryOver,
      has_change: currentBalance ? currentBalance.entitlement_days !== entitlement : true
    };
  });

  res.json({
    year: targetYear,
    preview: previewList,
    total_doctors: previewList.length,
    rules,
    settings
  });
});

// POST /api/tenure/apply - Batch apply calculated vacation entitlements into leave_balances
router.post('/tenure/apply', (req, res) => {
  const db = getDb();
  const targetYear = parseInt(req.body.year, 10) || new Date().getFullYear();
  const applyCarryOver = req.body.apply_carry_over !== false;
  const actorId = req.body.actor_id || null;

  const rules = db.tenure_rules || [];
  const settings = db.tenure_settings || { max_carry_over_days: 5.0, allow_part_time: false };
  const vacationType = db.leave_types.find(lt => lt.code === 'VACATION') || db.leave_types[0];

  const asOfDate = new Date(`${targetYear}-12-31`);
  const prevYear = targetYear - 1;
  let updatedCount = 0;
  let insertedCount = 0;

  db.doctors.forEach(doctor => {
    const tenure = calculateTenure(doctor.hire_date, asOfDate);
    const { entitlement } = calculateVacationEntitlement(doctor, tenure, rules, targetYear, settings);

    let proposedCarryOver = 0;
    if (applyCarryOver) {
      const prevBalance = db.leave_balances.find(
        b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === prevYear
      );
      if (prevBalance) {
        const remainingPrev = (prevBalance.entitlement_days + prevBalance.carried_over_days) - (prevBalance.used_days + prevBalance.pending_days);
        if (remainingPrev > 0) {
          proposedCarryOver = Math.min(remainingPrev, settings.max_carry_over_days);
        }
      }
    }

    const existingIndex = db.leave_balances.findIndex(
      b => b.doctor_id === doctor.id && b.leave_type_id === vacationType.id && b.fiscal_year === targetYear
    );

    if (existingIndex !== -1) {
      db.leave_balances[existingIndex].entitlement_days = entitlement;
      if (applyCarryOver) {
        db.leave_balances[existingIndex].carried_over_days = proposedCarryOver;
      }
      db.leave_balances[existingIndex].updated_at = new Date().toISOString();
      updatedCount++;
    } else {
      db.leave_balances.push({
        id: uuidv4(),
        doctor_id: doctor.id,
        leave_type_id: vacationType.id,
        fiscal_year: targetYear,
        entitlement_days: entitlement,
        carried_over_days: applyCarryOver ? proposedCarryOver : 0,
        used_days: 0,
        pending_days: 0,
        updated_at: new Date().toISOString()
      });
      insertedCount++;
    }
  });

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'leave_balances',
    record_id: `batch-tenure-${targetYear}`,
    action: 'UPDATE',
    actor_id: actorId,
    new_data: { note: `Applied tenure vacation entitlements for year ${targetYear}`, updatedCount, insertedCount },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({
    message: `ประมวลผลสิทธิ์วันลาพักผ่อนประจำปี ${targetYear} สำเร็จ (${insertedCount} เพิ่มใหม่, ${updatedCount} ปรับปรุง)`,
    year: targetYear,
    updatedCount,
    insertedCount
  });
});

// -------------------------------------------------------------
// APPROVAL ROUTES MANAGEMENT (PHASE 4 - ITEM 24)
// -------------------------------------------------------------

// GET /api/approval-routes - List all approval routes with doctor & approver info
router.get('/approval-routes', (req, res) => {
  const db = getDb();
  if (!db.approval_routes) db.approval_routes = [];

  const enriched = db.approval_routes.map(route => {
    const doctor = db.doctors.find(d => d.id === route.doctor_id);
    const approver = db.doctors.find(d => d.id === route.approver_id);
    const dept = doctor ? db.departments.find(dp => dp.id === doctor.department_id) : null;

    return {
      ...route,
      doctor_name: doctor ? `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}` : 'ไม่ระบุ',
      doctor_employee_id: doctor?.employee_id || '-',
      department_name: dept?.name_th || 'ไม่ระบุ',
      approver_name: approver ? `${approver.prefix_th}${approver.first_name_th} ${approver.last_name_th}` : 'ไม่ระบุ',
      approver_employee_id: approver?.employee_id || '-'
    };
  });

  res.json(enriched);
});

// POST /api/approval-routes - Create or update an approval route
router.post('/approval-routes', (req, res) => {
  const db = getDb();
  if (!db.approval_routes) db.approval_routes = [];

  const { doctor_id, step_order = 1, approver_id, is_active = true, actor_id } = req.body;

  if (!doctor_id || !approver_id) {
    return res.status(400).json({ error: 'กรุณาระบุแพทย์และผู้อนุมัติ' });
  }

  if (doctor_id === approver_id) {
    return res.status(400).json({ error: 'แพทย์ไม่สามารถเป็นผู้อนุมัติตนเองได้' });
  }

  const existingIndex = db.approval_routes.findIndex(
    r => r.doctor_id === doctor_id && r.step_order === Number(step_order)
  );

  let result;
  if (existingIndex !== -1) {
    db.approval_routes[existingIndex].approver_id = approver_id;
    db.approval_routes[existingIndex].is_active = Boolean(is_active);
    result = db.approval_routes[existingIndex];
  } else {
    result = {
      id: uuidv4(),
      doctor_id,
      step_order: Number(step_order),
      approver_id,
      is_active: Boolean(is_active),
      created_at: new Date().toISOString()
    };
    db.approval_routes.push(result);
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: result.id,
    action: existingIndex !== -1 ? 'UPDATE' : 'INSERT',
    actor_id: actor_id || null,
    new_data: result,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.status(201).json(result);
});

// PUT /api/approval-routes/:id - Update approval route
router.put('/approval-routes/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { approver_id, step_order, is_active, actor_id } = req.body;

  const index = db.approval_routes.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบสายอนุมัติที่ระบุ' });
  }

  if (approver_id) {
    if (db.approval_routes[index].doctor_id === approver_id) {
      return res.status(400).json({ error: 'แพทย์ไม่สามารถเป็นผู้อนุมัติตนเองได้' });
    }
    db.approval_routes[index].approver_id = approver_id;
  }
  if (step_order !== undefined) {
    db.approval_routes[index].step_order = Number(step_order);
  }
  if (is_active !== undefined) {
    db.approval_routes[index].is_active = Boolean(is_active);
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: id,
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: db.approval_routes[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json(db.approval_routes[index]);
});

// DELETE /api/approval-routes/:id - Delete approval route
router.delete('/approval-routes/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = db.approval_routes.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบสายอนุมัติที่ระบุ' });
  }

  const deleted = db.approval_routes[index];
  db.approval_routes.splice(index, 1);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: id,
    action: 'DELETE',
    actor_id: req.body?.actor_id || null,
    old_data: deleted,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'ลบสายอนุมัติสำเร็จ', id });
});

// POST /api/approval-routes/batch-department - Assign approver for all doctors in a department
router.post('/approval-routes/batch-department', (req, res) => {
  const db = getDb();
  const { department_id, approver_id, step_order = 1, actor_id } = req.body;

  if (!department_id || !approver_id) {
    return res.status(400).json({ error: 'กรุณาระบุแผนกและผู้อนุมัติ' });
  }

  const deptDoctors = db.doctors.filter(d => d.department_id === department_id && d.id !== approver_id);
  let count = 0;

  deptDoctors.forEach(doc => {
    const existing = db.approval_routes.find(
      r => r.doctor_id === doc.id && r.step_order === Number(step_order)
    );
    if (existing) {
      existing.approver_id = approver_id;
      existing.is_active = true;
    } else {
      db.approval_routes.push({
        id: uuidv4(),
        doctor_id: doc.id,
        step_order: Number(step_order),
        approver_id,
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
    count++;
  });

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'approval_routes',
    record_id: `batch-dept-${department_id}`,
    action: 'UPDATE',
    actor_id: actor_id || null,
    new_data: { department_id, approver_id, assigned_count: count },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: `กำหนดผู้อนุมัติให้แพทย์ในแผนกเรียบร้อย (${count} ท่าน)`, count });
});

// -------------------------------------------------------------
// SHIFT & SCHEDULE MANAGEMENT (Feature #26)
// -------------------------------------------------------------

const SHIFT_TYPE_MAP = {
  OPD_MORNING: {
    label: 'OPD เช้า',
    full_label: 'ตรวจผู้ป่วยนอกรอบเช้า (08:00 - 12:00)',
    color: '#0284c7',
    start_time: '08:00',
    end_time: '12:00',
    is_mandatory_handover: false
  },
  OPD_AFTERNOON: {
    label: 'OPD บ่าย',
    full_label: 'ตรวจผู้ป่วยนอกรอบบ่าย (13:00 - 17:00)',
    color: '#0ea5e9',
    start_time: '13:00',
    end_time: '17:00',
    is_mandatory_handover: false
  },
  IPD_ROUND: {
    label: 'Ward Round',
    full_label: 'ตรวจเยี่ยมผู้ป่วยใน (09:00 - 13:00)',
    color: '#8b5cf6',
    start_time: '09:00',
    end_time: '13:00',
    is_mandatory_handover: true
  },
  ER_DUTY: {
    label: 'เวร ER',
    full_label: 'เวรแพทย์ห้องฉุกเฉิน (08:00 - 20:00)',
    color: '#ef4444',
    start_time: '08:00',
    end_time: '20:00',
    is_mandatory_handover: true
  },
  NIGHT_DUTY: {
    label: 'เวรดึก',
    full_label: 'เวรดึกประจำโรงพยาบาล (20:00 - 08:00)',
    color: '#6366f1',
    start_time: '20:00',
    end_time: '08:00',
    is_mandatory_handover: true
  },
  ON_CALL: {
    label: 'On-Call',
    full_label: 'เวรแพทย์ให้คำปรึกษาทางโทรศัพท์ (24 ชม.)',
    color: '#10b981',
    start_time: '08:00',
    end_time: '08:00',
    is_mandatory_handover: true
  }
};

// GET /api/shifts - List shifts with filters and conflict enrichment
router.get('/shifts', (req, res) => {
  const db = getDb();
  const { department_id, doctor_id, month, year, start_date, end_date, status } = req.query;

  let shifts = db.doctor_shifts || [];

  if (department_id) {
    shifts = shifts.filter(s => s.department_id === department_id);
  }
  if (doctor_id) {
    shifts = shifts.filter(s => s.doctor_id === doctor_id);
  }
  if (status) {
    shifts = shifts.filter(s => s.status === status);
  }
  if (month && year) {
    const padMonth = String(month).padStart(2, '0');
    const target = `${year}-${padMonth}`;
    shifts = shifts.filter(s => s.shift_date && s.shift_date.startsWith(target));
  }
  if (start_date && end_date) {
    shifts = shifts.filter(s => s.shift_date >= start_date && s.shift_date <= end_date);
  }

  // Enrich with doctor, department, substitute, and conflict status
  const enriched = shifts.map(shift => {
    const doc = db.doctors.find(d => d.id === shift.doctor_id);
    const subDoc = shift.substitute_doctor_id ? db.doctors.find(d => d.id === shift.substitute_doctor_id) : null;
    const dept = db.departments.find(dp => dp.id === shift.department_id);
    const typeMeta = SHIFT_TYPE_MAP[shift.shift_type] || {
      label: shift.shift_type,
      full_label: shift.shift_type,
      color: '#64748b',
      is_mandatory_handover: false
    };

    // Check if doctor has active leave request on this shift date
    const leaveConflict = (db.leave_requests || []).find(r => 
      r.doctor_id === shift.doctor_id &&
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      shift.shift_date >= r.start_date &&
      shift.shift_date <= r.end_date
    );

    return {
      ...shift,
      shift_type_meta: typeMeta,
      doctor: doc ? {
        id: doc.id,
        name: `${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
        employee_id: doc.employee_id,
        doctor_type: doc.doctor_type,
        avatar: doc.avatar
      } : null,
      substitute_doctor: subDoc ? {
        id: subDoc.id,
        name: `${subDoc.prefix_th}${subDoc.first_name_th} ${subDoc.last_name_th}`,
        employee_id: subDoc.employee_id,
        avatar: subDoc.avatar
      } : null,
      department: dept ? {
        id: dept.id,
        code: dept.code,
        name_th: dept.name_th
      } : null,
      has_leave_conflict: Boolean(leaveConflict),
      conflict_leave: leaveConflict ? {
        id: leaveConflict.id,
        request_no: leaveConflict.request_no,
        status: leaveConflict.status,
        duration_days: leaveConflict.duration_days
      } : null
    };
  });

  enriched.sort((a, b) => a.shift_date.localeCompare(b.shift_date));
  res.json(enriched);
});

// GET /api/shifts/check-conflict - Real-time collision detection before leave submission
router.get('/shifts/check-conflict', (req, res) => {
  const db = getDb();
  const { doctor_id, start_date, end_date, half_day_type = 'FULL_DAY' } = req.query;

  if (!doctor_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'doctor_id, start_date, and end_date are required' });
  }

  const shifts = (db.doctor_shifts || []).filter(s =>
    s.doctor_id === doctor_id &&
    s.status === 'SCHEDULED' &&
    s.shift_date >= start_date &&
    s.shift_date <= end_date
  );

  const conflicts = shifts.map(s => {
    const meta = SHIFT_TYPE_MAP[s.shift_type] || {};
    return {
      id: s.id,
      shift_date: s.shift_date,
      shift_type: s.shift_type,
      shift_label: meta.label || s.shift_type,
      full_label: meta.full_label || s.shift_type,
      time: `${s.start_time || '08:00'} - ${s.end_time || '16:00'}`,
      is_mandatory_handover: Boolean(meta.is_mandatory_handover),
      notes: s.notes
    };
  });

  const requiresSubstitute = conflicts.some(c => c.is_mandatory_handover);

  res.json({
    has_conflict: conflicts.length > 0,
    conflict_count: conflicts.length,
    conflicts,
    requires_substitute: requiresSubstitute,
    message: conflicts.length > 0
      ? `ตรวจพบตารางเวร ${conflicts.length} รายการตรงกับช่วงวันลา${requiresSubstitute ? ' (จำเป็นต้องระบุแพทย์รับเวรแทน)' : ''}`
      : 'ไม่พบตารางเวรตรงกับช่วงวันลา'
  });
});

// POST /api/shifts - Create single shift
router.post('/shifts', (req, res) => {
  const db = getDb();
  const {
    doctor_id,
    shift_date,
    shift_type,
    department_id,
    start_time,
    end_time,
    notes = '',
    actor_id
  } = req.body;

  if (!doctor_id || !shift_date || !shift_type) {
    return res.status(400).json({ error: 'กรุณาระบุแพทย์, วันที่ และประเภทเวร' });
  }

  const doc = db.doctors.find(d => d.id === doctor_id);
  const deptId = department_id || (doc ? doc.department_id : null);
  const meta = SHIFT_TYPE_MAP[shift_type] || {};

  const newShift = {
    id: uuidv4(),
    doctor_id,
    shift_date,
    shift_type,
    department_id: deptId,
    start_time: start_time || meta.start_time || '08:00',
    end_time: end_time || meta.end_time || '16:00',
    status: 'SCHEDULED',
    substitute_doctor_id: null,
    notes: notes.trim(),
    created_at: new Date().toISOString()
  };

  if (!db.doctor_shifts) db.doctor_shifts = [];
  db.doctor_shifts.push(newShift);

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: newShift.id,
    action: 'INSERT',
    actor_id: actor_id || null,
    new_data: newShift,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.status(201).json(newShift);
});

// PUT /api/shifts/:id - Update shift
router.put('/shifts/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = (db.doctor_shifts || []).findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบตารางเวรที่ระบุ' });
  }

  const oldData = { ...db.doctor_shifts[index] };
  const updates = req.body;

  if (updates.doctor_id) db.doctor_shifts[index].doctor_id = updates.doctor_id;
  if (updates.shift_date) db.doctor_shifts[index].shift_date = updates.shift_date;
  if (updates.shift_type) db.doctor_shifts[index].shift_type = updates.shift_type;
  if (updates.start_time) db.doctor_shifts[index].start_time = updates.start_time;
  if (updates.end_time) db.doctor_shifts[index].end_time = updates.end_time;
  if (updates.status) db.doctor_shifts[index].status = updates.status;
  if (updates.substitute_doctor_id !== undefined) db.doctor_shifts[index].substitute_doctor_id = updates.substitute_doctor_id;
  if (updates.notes !== undefined) db.doctor_shifts[index].notes = updates.notes;

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: id,
    action: 'UPDATE',
    actor_id: updates.actor_id || null,
    old_data: oldData,
    new_data: db.doctor_shifts[index],
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json(db.doctor_shifts[index]);
});

// DELETE /api/shifts/:id - Delete shift
router.delete('/shifts/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const index = (db.doctor_shifts || []).findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'ไม่พบตารางเวรที่ระบุ' });
  }

  const removed = db.doctor_shifts.splice(index, 1)[0];

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: id,
    action: 'DELETE',
    actor_id: req.body?.actor_id || null,
    old_data: removed,
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'ลบรายการเวรสำเร็จ', id });
});

// POST /api/shifts/swap - Shift swap between two doctors
router.post('/shifts/swap', (req, res) => {
  const db = getDb();
  const { shift_id, target_doctor_id, reason = '', actor_id } = req.body;

  if (!shift_id || !target_doctor_id) {
    return res.status(400).json({ error: 'กรุณาระบุเวรที่ต้องการแลกและแพทย์ผู้รับเวร' });
  }

  const shift = (db.doctor_shifts || []).find(s => s.id === shift_id);
  if (!shift) {
    return res.status(404).json({ error: 'ไม่พบรายการเวรที่ระบุ' });
  }

  const oldDocId = shift.doctor_id;
  shift.doctor_id = target_doctor_id;
  shift.status = 'SWAPPED';
  shift.notes = `${shift.notes ? shift.notes + ' | ' : ''}แลกเวรจากเดิม: ${reason || 'ตามข้อตกลง'}`;

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: shift.id,
    action: 'SWAP',
    actor_id: actor_id || null,
    old_data: { doctor_id: oldDocId },
    new_data: { doctor_id: target_doctor_id, reason },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({ message: 'บันทึกการแลกเวรสำเร็จ', shift });
});

// POST /api/shifts/batch-monthly - Auto-generate department duty roster for whole month
router.post('/shifts/batch-monthly', (req, res) => {
  const db = getDb();
  const { department_id, year, month, actor_id, overwrite = false } = req.body;

  if (!department_id || !year || !month) {
    return res.status(400).json({ error: 'กรุณาระบุแผนก, ปี และเดือน' });
  }

  const deptDoctors = db.doctors.filter(d => d.department_id === department_id && d.is_active);
  if (deptDoctors.length === 0) {
    return res.status(400).json({ error: 'ไม่พบแพทย์ที่สังกัดแผนกนี้' });
  }

  const numYear = Number(year);
  const numMonth = Number(month);
  const daysInMonth = new Date(numYear, numMonth, 0).getDate();
  const padMonth = String(numMonth).padStart(2, '0');

  if (!db.doctor_shifts) db.doctor_shifts = [];

  // If overwrite, remove existing shifts for this department and month
  if (overwrite) {
    const targetPrefix = `${numYear}-${padMonth}`;
    db.doctor_shifts = db.doctor_shifts.filter(
      s => !(s.department_id === department_id && s.shift_date.startsWith(targetPrefix))
    );
  }

  let createdCount = 0;
  const shiftTypes = ['OPD_MORNING', 'OPD_AFTERNOON', 'IPD_ROUND', 'ER_DUTY', 'ON_CALL'];

  for (let day = 1; day <= daysInMonth; day++) {
    const padDay = String(day).padStart(2, '0');
    const dateStr = `${numYear}-${padMonth}-${padDay}`;
    const dateObj = new Date(numYear, numMonth - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Distribute duties among doctors
    deptDoctors.forEach((doc, docIdx) => {
      // Rotate duty pattern
      const dutyIndex = (day + docIdx) % shiftTypes.length;
      const typeKey = shiftTypes[dutyIndex];
      const meta = SHIFT_TYPE_MAP[typeKey];

      // Check if shift already exists for this doctor and date
      const exists = db.doctor_shifts.some(
        s => s.doctor_id === doc.id && s.shift_date === dateStr && s.shift_type === typeKey
      );

      if (!exists) {
        db.doctor_shifts.push({
          id: uuidv4(),
          doctor_id: doc.id,
          shift_date: dateStr,
          shift_type: typeKey,
          department_id,
          start_time: isWeekend && typeKey === 'ER_DUTY' ? '08:00' : meta.start_time,
          end_time: isWeekend && typeKey === 'ER_DUTY' ? '20:00' : meta.end_time,
          status: 'SCHEDULED',
          substitute_doctor_id: null,
          notes: isWeekend ? 'เวรวันหยุดสุดสัปดาห์' : 'ตารางเวรประจำวันตามรอบ',
          created_at: new Date().toISOString()
        });
        createdCount++;
      }
    });
  }

  db.audit_logs.push({
    id: uuidv4(),
    table_name: 'doctor_shifts',
    record_id: `batch-${department_id}-${numYear}-${padMonth}`,
    action: 'BATCH_GENERATE',
    actor_id: actor_id || null,
    new_data: { department_id, year: numYear, month: numMonth, created_count: createdCount },
    ip_address: req.ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });

  saveStore();
  res.json({
    message: `สร้างตารางเวรประจำเดือน ${padMonth}/${numYear} เรียบร้อยแล้ว (${createdCount} รายการ)`,
    created_count: createdCount
  });
});

export default router;
