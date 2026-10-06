import dotenv from 'dotenv';
dotenv.config();

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';

// Store recent sent messages in memory for the Live LINE Simulator / Inspector
export const simulatedLineMessages = [];

export const isLineConfigured = Boolean(LINE_CHANNEL_ACCESS_TOKEN && LINE_CHANNEL_ACCESS_TOKEN.length > 20);

/**
 * Send push message to LINE User (or record in simulator if token is not set)
 */
export async function sendLinePushMessage(toLineUserId, messages) {
  // === OVERRIDE FOR DEMO / TESTING ===
  const overrideId = process.env.TEST_LINE_USER_ID;
  const targetId = (overrideId && overrideId.length > 10) ? overrideId : toLineUserId;

  const payload = {
    to: targetId,
    messages: Array.isArray(messages) ? messages : [messages],
    sentAt: new Date().toISOString(),
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    originalTo: toLineUserId // Keep track of who it was supposed to go to
  };

  // Record into simulator log
  simulatedLineMessages.unshift(payload);
  if (simulatedLineMessages.length > 50) {
    simulatedLineMessages.pop();
  }

  if (!isLineConfigured) {
    console.log(`[LINE SIMULATOR] 📱 Sent 1-on-1 Message to ${targetId}:`, JSON.stringify(messages, null, 2));
    return { success: true, simulated: true, payload };
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: Array.isArray(messages) ? messages : [messages],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[LINE API Error]', res.status, data);
      return { success: false, error: data, simulated: false };
    }

    console.log(`[LINE API] 🚀 Successfully pushed message to ${toLineUserId}`);
    return { success: true, data, simulated: false };
  } catch (err) {
    console.error('[LINE Network Error]', err);
    return { success: false, error: err.message, simulated: false };
  }
}

/**
 * 1. Flex Message: แจ้งแพทย์เมื่อยื่นใบลาสำเร็จ (1-on-1 Doctor Submission Confirmation)
 */
export function buildDoctorSubmittedFlex(request, doctor, leaveType) {
  const periodText = request.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                     request.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (เต็มวัน)';
  const dateText = request.start_date === request.end_date
    ? `${request.start_date}${periodText}`
    : `${request.start_date} ถึง ${request.end_date} (${request.duration_days} วัน)`;

  return {
    type: 'flex',
    altText: `ยื่นใบลาสำเร็จ: ${leaveType.name_th} (${dateText})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#006699',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#b0d9f0',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: '✅ ยื่นใบลาสำเร็จ (รออนุมัติ)',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่ใบลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.request_no || '-', size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภทการลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: leaveType.name_th, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่ลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: dateText, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reason || 'ไม่ระบุ', size: 'sm', color: '#334155', flex: 5, wrap: true }
            ]
          },
          request.is_emergency ? {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#fef2f2',
            cornerRadius: '8px',
            paddingAll: '10px',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: '🚨 ลาฉุกเฉินวันเดียวกัน: กรุณาโทรแจ้งพี่กุ้งทันที',
                size: 'xs',
                color: '#dc2626',
                weight: 'bold',
                wrap: true
              }
            ]
          } : { type: 'filler' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'ระบบส่งแจ้งเตือนไปยังหัวหน้าแผนกเรียบร้อยแล้ว',
            size: 'xs',
            color: '#94a3b8',
            align: 'center'
          }
        ]
      }
    }
  };
}

/**
 * 2. Flex Message: ส่งถึงหัวหน้าแผนก (1-on-1 Approver Request) มีปุ่ม 1-click Approve
 */
export function buildApproverRequestFlex(request, doctor, leaveType, quotaInfo, appUrl) {
  const periodText = request.half_day_type === 'MORNING' ? ' (ครึ่งวันเช้า)' :
                     request.half_day_type === 'AFTERNOON' ? ' (ครึ่งวันบ่าย)' : ' (เต็มวัน)';
  const dateText = request.start_date === request.end_date
    ? `${request.start_date}${periodText}`
    : `${request.start_date} ถึง ${request.end_date} (${request.duration_days} วัน)`;

  const quotaColor = quotaInfo?.is_quota_exceeded ? '#ef4444' : '#10b981';
  const quotaText = quotaInfo 
    ? `ลาแล้ว ${quotaInfo.current_on_leave}/${quotaInfo.max_allowed} ท่าน ${quotaInfo.is_quota_exceeded ? '(⚠️ เกินโควตา)' : '(ปกติ)'}`
    : 'ปกติ';

  return {
    type: 'flex',
    altText: `[ขออนุมัติลา] ${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th} (${leaveType.name_th})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: request.is_emergency ? '#dc2626' : '#006699',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#e0f2fe',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: request.is_emergency ? '🚨 ขออนุมัติลาฉุกเฉิน (ด่วนพิเศษ)' : '📋 มีคำขออนุมัติการลาใหม่',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'แพทย์:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${leaveType.name_th} (${doctor.doctor_type === 'FULL_TIME' ? 'FT' : 'PT'})`, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่ลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: dateText, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reason || 'ไม่ระบุ', size: 'sm', color: '#334155', flex: 5, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: 'โควตาแผนก:', size: 'xs', color: '#64748b', flex: 3 },
              { type: 'text', text: quotaText, size: 'xs', weight: 'bold', color: quotaColor, flex: 5 }
            ]
          },
          request.is_exception ? {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#fffbeb',
            cornerRadius: '8px',
            paddingAll: '8px',
            margin: 'xs',
            contents: [
              {
                type: 'text',
                text: '⚠️ คำขอข้อยกเว้นพิเศษ (เนื่องจากโควตาเต็ม)',
                size: 'xs',
                color: '#b45309',
                weight: 'bold'
              }
            ]
          } : { type: 'filler' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#059669', // Emerald
            action: {
              type: 'postback',
              label: '✅ อนุมัติทันที (1-Click)',
              data: `action=approve&id=${request.id}&reqNo=${request.request_no}`,
              displayText: `อนุมัติใบลา ${request.request_no}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            color: '#dc2626',
            action: {
              type: 'uri',
              label: '❌ ระบุเหตุผล / ไม่อนุมัติ',
              uri: `${appUrl || 'http://localhost:5173'}/approver?id=${request.id}&action=reject`
            }
          }
        ]
      }
    }
  };
}

/**
 * 3. Flex Message: แจ้งแพทย์เมื่อคำขอได้รับการอนุมัติ / ไม่อนุมัติ
 */
export function buildLeaveDecisionFlex(request, doctor, leaveType, action, approverName, comments) {
  const isApproved = action === 'APPROVED';
  const headerBg = isApproved ? '#059669' : '#dc2626';
  const statusTitle = isApproved ? '🎉 ใบลาได้รับการอนุมัติ' : '❌ ใบลาไม่ได้รับการอนุมัติ';

  return {
    type: 'flex',
    altText: `${statusTitle}: ${leaveType.name_th} (${request.request_no})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerBg,
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'โรงพยาบาลกรุงเทพสิริโรจน์',
            color: '#ffffff',
            size: 'xs',
            weight: 'bold',
            opacity: 0.85
          },
          {
            type: 'text',
            text: statusTitle,
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เลขที่ใบลา:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.request_no, size: 'sm', weight: 'bold', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: leaveType.name_th, size: 'sm', weight: 'bold', color: '#006699', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'วันที่:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: `${request.start_date} (${request.duration_days} วัน)`, size: 'sm', color: '#0f172a', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ผู้อนุมัติ:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: approverName || 'หัวหน้าแผนก', size: 'sm', weight: 'bold', color: '#334155', flex: 5 }
            ]
          },
          comments ? {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล/หมายเหตุ:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: comments, size: 'sm', color: '#dc2626', flex: 5, wrap: true }
            ]
          } : { type: 'filler' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: isApproved ? 'ขอบคุณที่ปฏิบัติตามระเบียบการลาของ รพ.' : 'หากมีข้อสงสัย โปรดติดต่อฝ่ายการแพทย์',
            size: 'xs',
            color: '#94a3b8',
            align: 'center'
          }
        ]
      }
    }
  };
}

/**
 * 4. Flex Message: แจ้งเตือนพี่กุ้งกรณีลาฉุกเฉิน (Emergency Alert to P'Koong)
 */
export function buildEmergencyAlertFlex(request, doctor, leaveType, koongPhone) {
  return {
    type: 'flex',
    altText: `🚨 ด่วน! แพทย์แจ้งลาฉุกเฉิน: ${doctor.prefix_th}${doctor.first_name_th} (${doctor.phone})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#b91c1c',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '🚨 แจ้งเตือนฝ่ายการแพทย์ (ด่วนที่สุด)',
            color: '#fee2e2',
            size: 'xs',
            weight: 'bold'
          },
          {
            type: 'text',
            text: 'แพทย์แจ้งลาฉุกเฉินวันนี้',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: `${doctor.prefix_th}${doctor.first_name_th} ${doctor.last_name_th}`,
            size: 'md',
            weight: 'bold',
            color: '#0f172a'
          },
          {
            type: 'text',
            text: `${doctor.department_name || 'ไม่ระบุแผนก'} (${doctor.doctor_type === 'FULL_TIME' ? 'แพทย์ประจำ' : 'แพทย์พาร์ทไทม์'})`,
            size: 'sm',
            color: '#475569'
          },
          {
            type: 'separator',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: 'ประเภท:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: leaveType.name_th, size: 'sm', weight: 'bold', color: '#dc2626', flex: 5 }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เหตุผล:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: request.reason || 'ไม่ระบุ', size: 'sm', color: '#1e293b', flex: 5, wrap: true }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เบอร์แพทย์:', size: 'sm', color: '#64748b', flex: 3 },
              { type: 'text', text: doctor.phone || '-', size: 'sm', weight: 'bold', color: '#0369a1', flex: 5 }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#0284c7',
            action: {
              type: 'uri',
              label: '📞 โทรหาแพทย์ทันที',
              uri: `tel:${doctor.phone || '0822223344'}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🖥️ เปิด Admin Dashboard',
              uri: 'http://localhost:5173/admin'
            }
          }
        ]
      }
    }
  };
}

// ------------------------------------------------------------------
// 6. CANCEL ALERT FLEX MESSAGE
// ------------------------------------------------------------------
export function buildCancelAlertFlex(request, doc, leaveType) {
  const flex = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "แจ้งเตือนยกเลิกการลา",
          weight: "bold",
          size: "lg",
          color: "#ffffff"
        },
        {
          type: "text",
          text: `โดย ${doc.prefix_th}${doc.first_name_th} ${doc.last_name_th}`,
          size: "xs",
          color: "#ffffffcc"
        }
      ],
      backgroundColor: "#ef4444", // Rose 500
      paddingAll: "20px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "แพทย์ได้ทำการยกเลิกคำขอลาด้วยตนเอง",
          size: "sm",
          color: "#475569",
          wrap: true,
          weight: "bold",
          margin: "sm"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "เลขที่",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: request.request_no,
                  wrap: true,
                  color: "#333333",
                  size: "sm",
                  flex: 5,
                  weight: "bold"
                }
              ]
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "ประเภท",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: leaveType.name_th,
                  wrap: true,
                  color: "#333333",
                  size: "sm",
                  flex: 5
                }
              ]
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "วันที่",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2
                },
                {
                  type: "text",
                  text: request.start_date === request.end_date 
                          ? request.start_date 
                          : `${request.start_date} - ${request.end_date}`,
                  wrap: true,
                  color: "#333333",
                  size: "sm",
                  flex: 5
                }
              ]
            }
          ]
        }
      ]
    }
  };

  return [
    {
      type: "flex",
      altText: `ยกเลิกการลา: ${doc.first_name_th}`,
      contents: flex
    }
  ];
}
