import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Trash2, RefreshCw, Send, CheckCircle2, Phone, AlertTriangle } from 'lucide-react';

export default function LineSimulatorModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' or specific user ID

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/line/simulator/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch LINE simulator messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await fetch('/api/line/simulator/clear', { method: 'POST' });
    setMessages([]);
  };

  const handlePostback = async (postbackData) => {
    try {
      await fetch('/api/line/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [
            {
              type: 'postback',
              postback: { data: postbackData },
              timestamp: Date.now()
            }
          ]
        })
      });
      fetchMessages();
      window.dispatchEvent(new Event('leave-status-updated'));
    } catch (err) {
      console.error('Postback error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#78889b] rounded-2xl w-full max-w-md h-[90vh] max-h-[720px] flex flex-col shadow-2xl overflow-hidden border border-slate-700 animate-in fade-in duration-200">
        
        {/* LINE Chat Header */}
        <div className="bg-[#202b3c] text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#06C755] flex items-center justify-center font-bold text-white shadow-md">
              <span className="text-sm">BSI</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                Doctor Leave @ BSI
                <span className="bg-[#06C755] text-white text-[10px] px-1.5 py-0.2 rounded font-normal">
                  LINE OA
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">1-on-1 Flex Notification Simulator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMessages}
              title="รีเฟรชข้อความ"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClear}
              title="ล้างประวัติแชท"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Bar */}
        <div className="bg-[#1b2432] text-slate-300 text-[11px] px-3 py-1.5 border-b border-slate-700/80 flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            การแจ้งเตือนส่วนตัว (PDPA 100% — ไม่เข้ากลุ่มรวม)
          </span>
          <span className="text-slate-400 font-mono text-[10px]">
            {messages.length} ข้อความ
          </span>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-300 px-6">
              <div className="w-14 h-14 rounded-full bg-slate-700/60 flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium">ยังไม่มีข้อความ LINE แจ้งเตือน</p>
              <p className="text-xs text-slate-400 mt-1">
                เมื่อแพทย์ยื่นใบลา หรือมีการอนุมัติ ข้อความ Flex Message แบบ 1-on-1 จะปรากฏที่นี่ทันที
              </p>
            </div>
          ) : (
            messages.map((item, idx) => {
              const msg = item.messages?.[0];
              const flexContents = msg?.contents;
              const header = flexContents?.header;
              const body = flexContents?.body;
              const footer = flexContents?.footer;
              const toUser = item.to;

              return (
                <div key={item.id || idx} className="space-y-1">
                  <div className="text-[10px] text-slate-300 font-mono text-center my-1">
                    ส่งไปยัง: <span className="bg-slate-800/60 px-1.5 py-0.5 rounded text-sky-200">{toUser}</span>
                    <span className="ml-2 text-slate-400">{new Date(item.sentAt).toLocaleTimeString('th-TH')}</span>
                  </div>

                  {/* Render Flex Card Bubble */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 max-w-sm mx-auto">
                    {/* Header */}
                    {header && (
                      <div
                        className="p-3 text-white"
                        style={{ backgroundColor: header.backgroundColor || '#006699' }}
                      >
                        {header.contents?.map((c, i) => (
                          <div
                            key={i}
                            className={`leading-tight ${c.size === 'xs' ? 'text-xs opacity-90' : 'text-base font-bold'}`}
                            style={{ color: c.color || '#fff' }}
                          >
                            {c.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Body */}
                    {body && (
                      <div className="p-3.5 space-y-2 text-xs">
                        {body.contents?.map((row, rIdx) => {
                          if (row.type === 'horizontal') {
                            const label = row.contents?.[0]?.text;
                            const val = row.contents?.[1]?.text;
                            const valColor = row.contents?.[1]?.color || '#1e293b';
                            const isBold = row.contents?.[1]?.weight === 'bold';
                            return (
                              <div key={rIdx} className="flex justify-between items-baseline py-0.5 border-b border-slate-100 last:border-0">
                                <span className="text-slate-500 w-24 shrink-0">{label}</span>
                                <span className={`text-right ${isBold ? 'font-bold' : ''}`} style={{ color: valColor }}>
                                  {val}
                                </span>
                              </div>
                            );
                          }
                          if (row.type === 'vertical' && row.backgroundColor) {
                            return (
                              <div key={rIdx} className="p-2 rounded-lg text-xs" style={{ backgroundColor: row.backgroundColor }}>
                                {row.contents?.map((c, ci) => (
                                  <div key={ci} className="font-semibold" style={{ color: c.color }}>
                                    {c.text}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}

                    {/* Footer / Action Buttons */}
                    {footer && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1.5">
                        {footer.contents?.map((btnItem, bIdx) => {
                          if (btnItem.type === 'button') {
                            const action = btnItem.action;
                            const isApprove = action?.data?.includes('action=approve');
                            const isReject = action?.uri?.includes('reject');
                            const isPhone = action?.uri?.startsWith('tel:');

                            if (isApprove) {
                              return (
                                <button
                                  key={bIdx}
                                  onClick={() => handlePostback(action.data)}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-98"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {action.label}
                                </button>
                              );
                            }

                            if (isPhone) {
                              return (
                                <a
                                  key={bIdx}
                                  href={action.uri}
                                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 text-center"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {action.label}
                                </a>
                              );
                            }

                            return (
                              <div
                                key={bIdx}
                                className="w-full py-1.5 text-center bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                              >
                                {action?.label}
                              </div>
                            );
                          }

                          if (btnItem.type === 'text') {
                            return (
                              <div key={bIdx} className="text-[11px] text-slate-400 text-center">
                                {btnItem.text}
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#202b3c] p-2.5 text-center text-[11px] text-slate-400 border-t border-slate-700">
          จำลองการทำงานของ LINE Messaging API (Flex Messages) สำหรับ BSI
        </div>

      </div>
    </div>
  );
}
