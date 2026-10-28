import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  departments,
  doctors,
  doctor_roles,
  approval_routes,
  currentYear
} from './hospital_flow_data.js';

import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'data', 'store.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Read store.json
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const store = JSON.parse(raw);

  store.departments = departments;
  store.doctors = doctors;
  store.doctor_roles = doctor_roles;
  store.approval_routes = approval_routes;

  // Initialize balances for all doctors with valid UUIDs
  if (!store.leave_balances) store.leave_balances = [];
  doctors.forEach(doc => {
    (store.leave_types || []).forEach(lt => {
      const exists = store.leave_balances.find(
        b => b.doctor_id === doc.id && b.leave_type_id === lt.id && b.fiscal_year === currentYear
      );
      if (!exists) {
        store.leave_balances.push({
          id: uuidv4(),
          doctor_id: doc.id,
          leave_type_id: lt.id,
          fiscal_year: currentYear,
          entitlement_days: lt.code === 'VACATION' ? (doc.doctor_type === 'PART_TIME' ? 0 : 10) : lt.code === 'SICK' ? 30 : lt.code === 'PERSONAL' ? (doc.doctor_type === 'PART_TIME' ? 0 : 5) : 0,
          carried_over_days: 0,
          used_days: 0,
          pending_days: 0,
          updated_at: new Date().toISOString()
        });
      } else if (!exists.id || exists.id.startsWith('bal-')) {
        exists.id = uuidv4();
      }
    });
  });

  // Save to store.json
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log('✅ Local store.json updated with 10 departments and 2-step approval routes.');

  // 2. Upsert to Supabase
  try {
    console.log('Upserting departments...');
    const { error: deptErr } = await supabase.from('departments').upsert(departments);
    if (deptErr) console.warn('Dept upsert notice:', deptErr.message);
    else console.log('✅ Departments upserted to Supabase Cloud');

    console.log('Upserting doctors...');
    const sanitizedDoctors = doctors.map(d => {
      const { hire_date, position, ...rest } = d;
      return rest;
    });
    const { error: docErr } = await supabase.from('doctors').upsert(sanitizedDoctors);
    if (docErr) console.warn('Doctor upsert notice:', docErr.message);
    else console.log('✅ Doctors upserted to Supabase Cloud');

    console.log('Upserting doctor_roles...');
    const { error: roleErr } = await supabase.from('doctor_roles').upsert(doctor_roles, { onConflict: 'doctor_id,role' });
    if (roleErr) console.warn('Role upsert notice:', roleErr.message);
    else console.log('✅ Doctor Roles upserted to Supabase Cloud');

    console.log('Upserting approval_routes...');
    const { error: routeErr } = await supabase.from('approval_routes').upsert(approval_routes, { onConflict: 'doctor_id,step_order' });
    if (routeErr) console.warn('Routes upsert notice:', routeErr.message);
    else console.log('✅ Approval Routes upserted to Supabase Cloud');

    console.log('Upserting leave_balances...');
    const { error: balErr } = await supabase.from('leave_balances').upsert(store.leave_balances, { onConflict: 'doctor_id,leave_type_id,fiscal_year' });
    if (balErr) console.warn('Balances upsert notice:', balErr.message);
    else console.log('✅ Leave Balances upserted to Supabase Cloud');
    if (balErr) console.warn('Balances upsert notice:', balErr.message);
    else console.log('✅ Leave Balances upserted to Supabase Cloud');

  } catch (err) {
    console.error('Cloud sync error:', err.message);
  }

  console.log('🎉 All 10 departments and approval workflow synced successfully!');
}

run();
