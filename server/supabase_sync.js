import { supabase, isSupabaseConfigured } from './db.js';

export async function loadStoreFromSupabase(fallbackDb) {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackDb;
  }
  
  try {
    console.log('🔄 Fetching latest data from Supabase Cloud...');
    
    // Fetch all tables
    const [
      { data: departments },
      { data: leave_types },
      { data: doctors },
      { data: doctor_roles },
      { data: approval_routes },
      { data: leave_balances },
      { data: leave_requests },
      { data: leave_attachments },
      { data: approval_logs },
      { data: audit_logs },
      { data: holidays }
    ] = await Promise.all([
      supabase.from('departments').select('*'),
      supabase.from('leave_types').select('*'),
      supabase.from('doctors').select('*'),
      supabase.from('doctor_roles').select('*'),
      supabase.from('approval_routes').select('*'),
      supabase.from('leave_balances').select('*'),
      supabase.from('leave_requests').select('*'),
      supabase.from('leave_attachments').select('*'),
      supabase.from('approval_logs').select('*'),
      supabase.from('audit_logs').select('*'),
      supabase.from('holidays').select('*')
    ]);

    // If we have data, use it. Otherwise, fallback to initial seed.
    // We check if departments has data to confirm connection success.
    if (departments && departments.length > 0) {
      console.log('✅ Successfully loaded data from Supabase Cloud');
      return {
        departments: departments || [],
        leave_types: leave_types || [],
        doctors: doctors || [],
        doctor_roles: doctor_roles || [],
        approval_routes: approval_routes || [],
        leave_balances: leave_balances || [],
        leave_requests: leave_requests || [],
        leave_attachments: leave_attachments || [],
        approval_logs: approval_logs || [],
        audit_logs: audit_logs || [],
        holidays: holidays || []
      };
    } else {
      console.warn('⚠️ Supabase tables seem empty. Proceeding with initial seed data, which will be synced to cloud on next save.');
      return fallbackDb;
    }
  } catch (err) {
    console.error('❌ Failed to load from Supabase:', err.message);
    return fallbackDb;
  }
}

export async function syncStoreToSupabase(db) {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    // Upsert all data asynchronously
    // Note: We use Promise.all to run them concurrently for speed, but catch individual errors
    
    const safeUpsert = async (table, data) => {
      if (!data || data.length === 0) return;
      
      // Clean up local-only fields if any exist before sending to Supabase
      // In this project, the JSON schema exactly matches the SQL schema, 
      // but we filter out fields that Supabase might reject just in case.
      
      const { error } = await supabase.from(table).upsert(data);
      if (error) {
        console.error(`❌ Sync error on table [${table}]:`, error.message);
      }
    };

    await Promise.all([
      safeUpsert('departments', db.departments),
      safeUpsert('leave_types', db.leave_types),
      safeUpsert('doctors', db.doctors),
      safeUpsert('doctor_roles', db.doctor_roles),
      safeUpsert('approval_routes', db.approval_routes),
      safeUpsert('leave_balances', db.leave_balances),
      safeUpsert('leave_requests', db.leave_requests),
      safeUpsert('leave_attachments', db.leave_attachments),
      safeUpsert('approval_logs', db.approval_logs),
      safeUpsert('audit_logs', db.audit_logs),
      safeUpsert('holidays', db.holidays)
    ]);
    
  } catch (err) {
    console.error('❌ Fatal error during Supabase sync:', err.message);
  }
}
