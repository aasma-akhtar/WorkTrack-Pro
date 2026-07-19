# 🚀 WorkTrack Pro

**WorkTrack Pro** is a full-stack Employee Attendance & Workforce Management System designed to simplify workforce operations for organizations. It provides secure attendance tracking, leave management, shift scheduling, role-based access, analytics, and reporting while ensuring attendance can only be marked from authorized office locations using IP Whitelisting.

---

## 📌 Features

### 🔐 Authentication & Authorization
- JWT-based Authentication
- Secure Password Hashing (bcrypt)
- Role-Based Access Control (Admin, Manager, Employee)
- Protected Routes

### 👥 Employee Management
- Add, Edit & Delete Employees
- Assign Managers
- Employee Profiles
- Search & Filter Employees

### 📅 Attendance Management
- Check In / Check Out
- Daily Attendance Records
- Attendance History
- Office IP Whitelisting
- Late Arrival Detection

### 🕒 Shift Management
- Create Shifts
- Assign Employees to Shifts
- View Shift Schedule
- Update Shift Timings

### 📝 Leave Management
- Apply for Leave
- Approve/Reject Leave Requests
- Leave History
- Leave Balance Tracking

### 📊 Dashboard & Reports
- Attendance Analytics
- Employee Statistics
- Monthly Attendance Reports
- Leave Reports
- Shift Summary
- Export Reports (PDF/Excel)

### 📧 Notifications
- Email Notifications
- Leave Approval Alerts
- Shift Assignment Notifications

### 📖 API Documentation
- Swagger UI Documentation
- RESTful APIs

---

# 🛠 Tech Stack

## Frontend
- React.js
- Tailwind CSS
- React Router
- Axios
- Redux Toolkit

## Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt
- Swagger

## Database
- PostgreSQL

## Other Tools
- Git & GitHub
- Postman
- dotenv
- Nodemon

---

# 📂 Project Structure

```
WorkTrack-Pro
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── redux
│   │   ├── services
│   │   ├── hooks
│   │   └── App.jsx
│   │
│   └── package.json
│
├── backend
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── utils
│   ├── docs
│   ├── server.js
│   └── package.json
│
├── database
│   └── schema.sql
│
├── screenshots
├── README.md
└── .env
```

---

# 🗄 Database Schema

### Users
- id
- name
- email
- password_hash
- role
- manager_id

### Offices
- id
- name
- ip_whitelist
- latitude
- longitude
- radius_meters

### Attendance
- id
- user_id
- check_in
- check_out
- status
- office_id

### Leaves
- id
- employee_id
- leave_type
- start_date
- end_date
- status

### Shifts
- id
- shift_name
- start_time
- end_time

### User_Shifts
- id
- user_id
- shift_id
- assigned_date

---

# 🔐 Security Features

- JWT Authentication
- Password Encryption using bcrypt
- Role-Based Authorization
- Protected APIs
- Input Validation
- SQL Injection Protection
- Environment Variables
- Office IP Whitelisting
- CORS Configuration

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/worktrack-pro.git

cd worktrack-pro
```

---

## Backend Setup

```bash
cd backend

npm install
```

Create a `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=worktrack_pro

JWT_SECRET=your_jwt_secret
```

Run Backend

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend will run on:

```
http://localhost:5173
```

Backend:

```
http://localhost:5000
```

---

# 📖 Swagger Documentation

After running the backend, open:

```
http://localhost:5000/api-docs
```

to explore and test all available REST APIs.

---

# 📡 API Modules

- Authentication
- Users
- Employees
- Attendance
- Leave Management
- Shift Management
- Reports

---

# 👨‍💼 User Roles

### Admin
- Manage Employees
- Manage Managers
- Create Shifts
- View Reports
- Approve Leaves
- Dashboard Access

### Manager
- View Team Attendance
- Approve Team Leaves
- Assign Shifts
- View Team Reports

### Employee
- Mark Attendance
- Apply Leave
- View Attendance History
- View Assigned Shifts

---

# 🚀 Future Enhancements

- Face Recognition Attendance
- QR Code Attendance
- GPS Location Verification
- Payroll Integration
- Mobile Application
- Real-time Notifications using Socket.io
- Multi-Office Support
- AI-based Attendance Analytics

---

# 📷 Screenshots

Add screenshots of:

- Login Page
- Dashboard
- Attendance Module
- Leave Management
- Shift Management
- Reports
- Swagger Documentation

---

# 👩‍💻 Author

**Aasma Akhtar**

B.Tech Computer Science Engineering

Sharda University

LinkedIn: https://linkedin.com/in/aasma-akhtar

GitHub: https://github.com/yourusername

---

# 📄 License

This project is developed for educational and internship purposes.

---

## ⭐ Key Highlights

- Full Stack Workforce Management System
- React + Node.js + Express
- PostgreSQL Database
- JWT Authentication
- Role-Based Access Control
- Swagger API Documentation
- IP Whitelisting for Secure Attendance
- Shift Scheduling
- Leave Management
- Dashboard & Reports
- Production-ready Project Structure
