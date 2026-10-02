# Doctor Leave @ LINE (ระบบแจ้งลาแพทย์ผ่าน LINE OA)
### โรงพยาบาลกรุงเทพสิริโรจน์ (Bangkok Hospital Siriroj - BSI)

ระบบยื่นใบลาและอนุมัติการลาสำหรับแพทย์ผ่าน **LINE Official Account (LIFF)** และ **Web Admin Portal** ที่ออกแบบตามข้อกำหนด **PRD v1.0** และ **Database Schema (PostgreSQL / Supabase)** เพื่อแก้ปัญหาความยุ่งยากของระบบเดิม ยึดหลัก **PDPA 100% (แจ้งเตือนแบบ 1-on-1 ส่วนตัว ยกเลิกกลุ่มรวมเด็ดขาด)** ป้องกันตารางตรวจหลุดจากการลาฉุกเฉิน และลดภาระงานของฝ่ายการแพทย์ (พี่กุ้ง)

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. ฝั่งแพทย์ (Doctor Experience — LIFF Mobile UI)
* **Doctor-Friendly UX (< 60 วินาที):** ยื่นใบลาได้รวดเร็ว กรอกข้อมูลน้อยที่สุด
* **Smart Profile:** ดึงข้อมูลแพทย์, แผนก, และสถานะแพทย์ประจำ (FT) หรือแพทย์พาร์ทไทม์ (PT) อัตโนมัติ
* **Real-time Quota Balance:** แสดงยอดวันลาคงเหลือประจำปีทันที (พักร้อน, ลาป่วย, ลากิจ, ลาฝึกอบรม, ลาไม่รับค่าตอบแทน)
* **Department Quota Status Indicator:** แสดงสถานะโควตาแผนกบนวันที่เลือก (เขียว = ว่าง, ส้ม = ใกล้เต็ม, แดง = โควตาเต็ม)
* **คำขอข้อยกเว้นพิเศษ (Exception Request):** หากโควตาวันนั้นเต็มแล้ว แต่แพทย์มีความจำเป็นยิ่งยวด ระบบจะเปิดให้ยื่นพร้อมแจ้งเตือน Flag พิเศษ
* **ระบบจัดการลาฉุกเฉิน (Same-Day Emergency Leave):** หากยื่นลาในวันปัจจุบัน ระบบจะแสดงแถบเตือนสีแดงทันที พร้อมปุ่ม **One-Tap Call โทรหาพี่กุ้ง (076-361888)** และยิง Push Alert ด่วนเข้า LINE พี่กุ้ง
* **Doctor-Friendly Attachment UX:** รองรับการแนบไฟล์ (PDF/JPG/PNG) หรือเลือกติ๊ก **"แนบเอกสารตามหลังภายใน 3 วัน"** ได้เพื่อไม่ให้ติดขัดขณะยื่นบนมือถือ

### 2. ฝั่งผู้อนุมัติ (Approver Flow — หัวหน้าศูนย์/หน่วยงาน)
* **LINE Flex Message 1-on-1:** ส่งข้อความแจ้งเตือนหาหัวหน้าแผนกรายบุคคล (ไม่เข้ากลุ่มรวม)
* **1-Click Approve:** ปุ่มกดอนุมัติทันทีใน LINE ผ่าน Postback Action
* **ระบุเหตุผลเมื่อไม่อนุมัติ:** ลิงก์เปิดฟอร์มระบุเหตุผล
* **Approver Portal Web UI:** ตรวจสอบรายการรออนุมัติและประวัติย้อนหลัง

### 3. ฝั่งแอดมินฝ่ายการแพทย์ (พี่กุ้ง — Medical Admin Portal)
* **Emergency Leave Queue:** แจ้งเตือนการลาฉุกเฉินประจำวัน พร้อมปุ่มโทรหาแพทย์ทันที
* **บันทึกการลาแทนแพทย์:** บันทึกใบลาให้แพทย์กรณีโทรแจ้งด้วยปากเปล่า/ฉุกเฉิน
* **Override อนุมัติแทน:** กดอนุมัติแทนกรณีหัวหน้าแผนกติดผ่าตัด/ฉุกเฉิน
* **ตั้งค่าโควตาแผนก (Department Criteria):** กำหนด `min_staff_required` (แพทย์ขั้นต่ำ) และ `max_leave_per_day` (โควตาลาสูงสุด)
* **Audit Trail & PDPA:** เก็บบันทึกประวัติการกระทำทั้งหมด (ใครทำ, วันเวลา, ข้อมูลก่อน-หลัง, IP)

### 4. LIVE LINE Simulator & Flex Message Inspector
* มีตัวจำลองการส่ง LINE Flex Message แบบเรียลไทม์ในหน้าเว็บ เพื่อให้ทดสอบข้อความ 1-on-1, ปุ่มกดอนุมัติ และ Push Alert ได้ทันทีโดยไม่ต้องต่อ Webhook จริง

---

## 🛠️ โครงสร้างสถาปัตยกรรม (Tech Stack)

* **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, React Router
* **Backend:** Node.js, Express 5, Multer (File Uploads)
* **Database & Persistence:**
  * Supabase Client (`@supabase/supabase-js`) สำหรับเชื่อมต่อ PostgreSQL Cloud
  * มีระบบ **High-Fidelity Embedded Database Engine** ในตัวที่โหลดข้อมูลเริ่มต้น (Seed Data) ตาม `supabase_schema.sql` พร้อมใช้งานได้ทันทีโดยไม่ต้องติดตั้งฐานข้อมูลภายนอก
* **Notification Engine:** LINE Messaging API (Flex Messages 2.0) + In-App Live Simulator

---

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ (Getting Started)

### 1. การรันระบบในโหมดพัฒนา (Development Mode)

```bash
# ติดตั้ง Dependency
npm install

# รันทั้ง Backend Server (Port 5000) และ Frontend Vite (Port 5173) พร้อมกัน
npm run dev:all
```

* **Frontend App:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)

### 2. การรันแบบ Production Build

```bash
# คอมไพล์ Frontend
npm run build

# รัน Express Server เดี่ยว (ให้บริการทั้ง API และหน้าเว็บที่พอร์ต 5000)
npm run server
```

### 3. การรันชุดทดสอบอัตโนมัติ (Automated Workflow Test Suite)

ระบบมีไฟล์ทดสอบครอบคลุมทั้ง 12 ขั้นตอนการทำงาน (Health, Seed, Quotas, Submission, 1-Click Approve, Same-day Emergency, Admin Override, Balances, LINE Simulator, Audit Logs):

```bash
node test_workflow.js
```

---

## ⚙️ การตั้งค่า Environment Variables (.env)

ไฟล์ `.env` อยู่ที่ root ของโปรเจกต์:

```env
# พอร์ตของเซิร์ฟเวอร์
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5173

# เบอร์ติดต่อพี่กุ้ง ฝ่ายการแพทย์
KOONG_PHONE=076-361888
KOONG_NAME=คุณสิริมาศ (พี่กุ้ง) ฝ่ายการแพทย์

# Supabase (ระบุเมื่อต้องการต่อ Supabase Cloud ในระบบ Production)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LINE Official Account (ระบุเมื่อต้องการส่ง Push Message เข้า LINE จริง)
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LIFF_ID=
```

> **หมายเหตุ:** หากเว้นว่างค่า Supabase และ LINE ไว้ ระบบจะเปิดใช้งาน **Embedded Engine + LINE Simulator** อัตโนมัติ ทำให้สามารถทดสอบและพรีเซนต์ระบบได้ครบทุกฟังก์ชัน 100% ทันที

---

## 👥 บัญชีผู้ใช้งานจำลอง (Demo Personas)

สามารถสลับบทบาทได้ทันทีผ่านแถบ **Persona Switcher** ด้านบนของหน้าจอ:
1. **นพ.ชาติชาย วิสัยทัศน์ (DOC-002):** แพทย์ประจำ (Full-Time) แผนกอายุรกรรม — ทดสอบยื่นลาพักร้อน, ดูสิทธิ์คงเหลือ, ลาฉุกเฉิน
2. **พญ.กันต์ธีรา พิทักษ์ชีพ (DOC-003):** แพทย์พาร์ทไทม์ (Part-Time) แผนกอายุรกรรม — ทดสอบกฎยื่นเฉพาะลาไม่รับค่าตอบแทน (ไม่มีโควตาพักร้อน)
3. **นพ.ปารวี ชาญวิทย์ (DOC-001):** หัวหน้าแผนกอายุรกรรม (Approver) — ทดสอบกดอนุมัติ/ไม่อนุมัติ 1-Click
4. **คุณสิริมาศ (พี่กุ้ง):** แอดมินฝ่ายการแพทย์ (EMP-KOONG) — ทดสอบ Dashboard, รับแจ้งเหตุฉุกเฉิน, Override อนุมัติแทน, บันทึกการลาแทนแพทย์, ปรับเกณฑ์โควตาแผนก

---

## 📁 โครงสร้างโฟลเดอร์

```
D:\doctor-leave-line/
├── PRD.md                     # เอกสาร PRD ฉบับอนุมัติของโรงพยาบาลกรุงเทพสิริโรจน์
├── supabase_schema.sql        # โค้ดสร้างฐานข้อมูล PostgreSQL / Supabase Schema
├── package.json               # ค่าคอนฟิกและ Dependency
├── vite.config.js             # ค่าคอนฟิก Vite และ Proxy
├── tailwind.config.js         # ดีไซน์ระบบสี BSI Medical Blue & Teal
├── test_workflow.js           # สคริปต์ทดสอบระบบอัตโนมัติครบ 12 ขั้นตอน
├── server/
│   ├── index.js               # เซิร์ฟเวอร์ Express 5
│   ├── db.js                  # ระบบจัดการฐานข้อมูลและ Persistence
│   ├── line.js                # ตัวสร้าง Flex Message และ LINE API
│   ├── routes/
│   │   └── api.js             # REST API Endpoint ทั้งหมด
│   └── data/
│       └── store.json         # ฐานข้อมูลจำลองสำหรับ Local Development
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Router & App Shell
│   ├── index.css              # Custom Styling & Tailwind CSS
│   ├── context/
│   │   └── AuthContext.jsx    # ระบบจัดการ Persona & Session
│   ├── components/
│   │   ├── Navbar.jsx         # แถบเมนูนำทาง
│   │   ├── PersonaSwitcher.jsx# ตัวสลับผู้ใช้งานจำลอง 1-Click
│   │   └── LineSimulatorModal.jsx # เครื่องจำลองแชท LINE 1-on-1 Flex Message
│   └── pages/
│       ├── DoctorLiffPage.jsx     # หน้าจอ LIFF ยื่นใบลาแพทย์
│       ├── DoctorHistoryPage.jsx  # หน้าจอประวัติการลาของฉัน
│       ├── ApproverPage.jsx       # หน้าจอศูนย์อนุมัติสำหรับหัวหน้าแผนก
│       ├── AdminDashboardPage.jsx # แดชบอร์ดภาพรวมฝ่ายการแพทย์ (พี่กุ้ง)
│       ├── AdminCriteriaPage.jsx  # หน้าตั้งค่าเกณฑ์โควตาแผนก
│       └── AdminAuditPage.jsx     # หน้าตรวจสอบประวัติ Audit Log & PDPA
└── uploads/                   # โฟลเดอร์เก็บเอกสารแนบใบรับรองแพทย์
```
