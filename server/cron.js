import cron from 'node-cron';
import { getDb, saveStore } from './db.js';
import { sendLinePushMessage } from './line.js';

// Build a simple text-based Flex or Bubble for reminder
function buildReminderFlex(request, doc, leaveType, hours) {
  const flex = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `แจ้งเตือนค้างอนุมัติ (${hours} ชม.)`,
          weight: "bold",
          size: "lg",
          color: "#ffffff"
        },
        {
          type: "text",
          text: "โปรดพิจารณาอนุมัติใบลา",
          size: "xs",
          color: "#ffffffcc"
        }
      ],
      backgroundColor: "#f59e0b", // Amber 500
      paddingAll: "20px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `ใบลาของ ${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th} รอการอนุมัติมานานกว่า ${hours} ชั่วโมงแล้วครับ`,
          size: "sm",
          color: "#475569",
          wrap: true,
          margin: "sm"
        },
        {
          type: "button",
          style: "primary",
          color: "#006699",
          margin: "xl",
          action: {
            type: "uri",
            label: "เปิดศูนย์อนุมัติ",
            uri: `${process.env.APP_URL || 'http://localhost:5173'}/approver`
          }
        }
      ]
    }
  };
  return [{ type: 'flex', altText: `แจ้งเตือนใบลาค้างอนุมัติ ${hours} ชม.`, contents: flex }];
}

export function initCronJobs() {
  console.log('⏰ Initializing Auto-Reminder Cron Jobs...');

  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Checking for pending leave requests...');
    const db = getDb();
    const now = new Date();
    let updated = false;

    for (const req of db.leave_requests) {
      if (req.status !== 'PENDING') continue;

      const createdDate = new Date(req.created_at);
      const hoursDiff = (now - createdDate) / (1000 * 60 * 60);

      const doc = db.doctors.find(d => d.id === req.doctor_id);
      const leaveType = db.leave_types.find(lt => lt.id === req.leave_type_id);
      if (!doc || !leaveType) continue;

      // Find Approver
      const route = db.approval_routes.find(r => r.doctor_id === req.doctor_id && r.step_order === 1);
      const approverId = route ? route.approver_id : 'c0000000-0000-0000-0000-000000000002';
      const approver = db.doctors.find(d => d.id === approverId);

      if (!approver || !approver.line_user_id) continue;

      // Check 48 hours
      if (hoursDiff >= 48 && !req.reminder_sent_48) {
        req.reminder_sent_48 = true;
        updated = true;
        console.log(`[Cron] Sending 48hr reminder for Request ${req.request_no}`);
        const flex = buildReminderFlex(req, doc, leaveType, 48);
        await sendLinePushMessage(approver.line_user_id, flex).catch(console.error);
      } 
      // Check 24 hours
      else if (hoursDiff >= 24 && hoursDiff < 48 && !req.reminder_sent_24) {
        req.reminder_sent_24 = true;
        updated = true;
        console.log(`[Cron] Sending 24hr reminder for Request ${req.request_no}`);
        const flex = buildReminderFlex(req, doc, leaveType, 24);
        await sendLinePushMessage(approver.line_user_id, flex).catch(console.error);
      }
    }

    if (updated) {
      saveStore();
    }
  });
}
