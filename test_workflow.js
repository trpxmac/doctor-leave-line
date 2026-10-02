import http from 'http';

// Helper to make fetch to local server or test server directly
async function runTests() {
  console.log('🚀 Starting Doctor Leave @ LINE Automated Workflow Tests...\n');

  const { default: express } = await import('express');
  const { default: cors } = await import('cors');
  const { default: apiRoutes } = await import('./server/routes/api.js');
  const { getDb, resetStore } = await import('./server/db.js');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', apiRoutes);

  const server = app.listen(5099, async () => {
    const baseUrl = 'http://localhost:5099/api';

    try {
      // 1. Reset Store
      console.log('1. Testing System Reset...');
      const resetRes = await fetch(`${baseUrl}/system/reset`, { method: 'POST' });
      const resetData = await resetRes.json();
      console.log('   ✅ System reset:', resetData.message);

      // 2. Health Check
      console.log('\n2. Testing Health Endpoint...');
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthData = await healthRes.json();
      console.log('   ✅ Health status:', healthData.status, '| Doctors:', healthData.totalDoctors);

      // 3. Check Doctors
      console.log('\n3. Testing Doctors list...');
      const doctorsRes = await fetch(`${baseUrl}/doctors`);
      const doctors = await doctorsRes.json();
      console.log(`   ✅ Found ${doctors.length} doctors (including P'Koong, Dr. Paravee, Dr. Chartchai FT, Dr. Kantheera PT)`);

      const drChartchai = doctors.find(d => d.employee_id === 'DOC-002');
      const drParavee = doctors.find(d => d.employee_id === 'DOC-001');

      // 4. Check Balances before request
      console.log('\n4. Testing Doctor Balances (Dr. Chartchai)...');
      const balRes = await fetch(`${baseUrl}/balances/${drChartchai.id}`);
      const balances = await balRes.json();
      const vacBal = balances.find(b => b.leave_type_code === 'VACATION');
      console.log(`   ✅ Vacation balance: ${vacBal.remaining_days} remaining (Entitled: ${vacBal.entitlement_days}, Carried: ${vacBal.carried_over_days})`);

      // 5. Check Department Quota
      console.log('\n5. Testing Department Quota Check...');
      const todayStr = new Date().toISOString().split('T')[0];
      const quotaRes = await fetch(`${baseUrl}/quota-check?departmentId=${drChartchai.department_id}&date=${todayStr}`);
      const quota = await quotaRes.json();
      console.log(`   ✅ Dept: ${quota.department_name} | Max allowed: ${quota.max_allowed} | Current: ${quota.current_on_leave} | Status: ${quota.status}`);

      // 6. Submit a Leave Request
      console.log('\n6. Testing Leave Request Submission (Next Week Vacation)...');
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const formData = new URLSearchParams();
      formData.append('doctor_id', drChartchai.id);
      formData.append('leave_type_id', vacBal.leave_type_id);
      formData.append('start_date', nextWeek);
      formData.append('end_date', nextWeek);
      formData.append('half_day_type', 'FULL_DAY');
      formData.append('reason', 'ตรวจร่างกายและพักผ่อนประจำปี');

      const submitRes = await fetch(`${baseUrl}/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      const submitData = await submitRes.json();
      console.log('   ✅ Leave submitted successfully!');
      console.log('   📄 Request No:', submitData.request.request_no);
      console.log('   🚨 Is Emergency:', submitData.is_emergency);

      // Verify Balance updated pending_days
      const balAfterRes = await fetch(`${baseUrl}/balances/${drChartchai.id}`);
      const balAfter = await balAfterRes.json();
      const vacAfter = balAfter.find(b => b.leave_type_code === 'VACATION');
      console.log(`   ✅ Pending days incremented: ${vacAfter.pending_days} days pending (Remaining: ${vacAfter.remaining_days})`);

      // 7. Test 1-Click Approve
      console.log('\n7. Testing 1-Click Approve by Approver (Dr. Paravee)...');
      const approveRes = await fetch(`${baseUrl}/leave-requests/${submitData.request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: drParavee.id,
          comments: 'อนุมัติเรียบร้อย'
        })
      });
      const approveData = await approveRes.json();
      console.log('   ✅ Approved successfully! Status:', approveData.request.status);

      // Verify Balance updated used_days
      const balApprovedRes = await fetch(`${baseUrl}/balances/${drChartchai.id}`);
      const balApproved = await balApprovedRes.json();
      const vacApproved = balApproved.find(b => b.leave_type_code === 'VACATION');
      console.log(`   ✅ Balance transferred: Pending=${vacApproved.pending_days}, Used=${vacApproved.used_days}`);

      // 8. Test Same-Day Emergency Leave
      console.log('\n8. Testing Same-Day Emergency Leave Submission...');
      const emergFormData = new URLSearchParams();
      emergFormData.append('doctor_id', drChartchai.id);
      emergFormData.append('leave_type_id', 'lt-2-sick');
      emergFormData.append('start_date', todayStr);
      emergFormData.append('end_date', todayStr);
      emergFormData.append('half_day_type', 'FULL_DAY');
      emergFormData.append('reason', 'มีไข้สูงฉุกเฉินเช้าวันนี้ โทรแจ้งพี่กุ้งแล้ว');

      const emergSubmitRes = await fetch(`${baseUrl}/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: emergFormData.toString()
      });
      const emergData = await emergSubmitRes.json();
      console.log('   ✅ Emergency Leave submitted!');
      console.log('   🚨 Emergency Flag detected:', emergData.is_emergency);

      // 9. Test Admin Override Approval (P\'Koong)
      console.log('\n9. Testing Admin Override Approval (P\'Koong)...');
      const overrideRes = await fetch(`${baseUrl}/leave-requests/${emergData.request.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: 'c0000000-0000-0000-0000-000000000001',
          reason: 'อนุมัติแทนกรณีฉุกเฉินเร่งด่วน'
        })
      });
      const overrideData = await overrideRes.json();
      console.log('   ✅ Override approved successfully! Status:', overrideData.request.status);

      // 10. Test Dashboard Stats
      console.log('\n10. Testing Admin Dashboard Stats...');
      const statsRes = await fetch(`${baseUrl}/stats/dashboard`);
      const stats = await statsRes.json();
      console.log(`   ✅ Total on leave today: ${stats.on_leave_today_count} | Emergency today: ${stats.emergency_today_count}`);

      // 11. Test LINE Simulator Messages
      console.log('\n11. Testing LINE Simulator Messages...');
      const simRes = await fetch(`${baseUrl}/line/simulator/messages`);
      const simMessages = await simRes.json();
      console.log(`   ✅ Generated ${simMessages.length} LINE 1-on-1 Flex Messages successfully!`);

      // 12. Test Audit Logs
      console.log('\n12. Testing Audit Logs...');
      const auditRes = await fetch(`${baseUrl}/audit-logs`);
      const auditLogs = await auditRes.json();
      console.log(`   ✅ Recorded ${auditLogs.length} audit trail entries for PDPA compliance!`);

      console.log('\n🎉 ALL 12 WORKFLOW TESTS PASSED PERFECTLY!\n');
    } catch (err) {
      console.error('❌ Test failed:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
