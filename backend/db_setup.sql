-- WorkTrack Pro Database Schema
-- Run this in your PostgreSQL client (e.g. pgAdmin)

-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS leaves CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS user_shifts CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS offices CASCADE;

-- Create Offices Table
CREATE TABLE offices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_whitelist TEXT NOT NULL, -- Comma-separated list of whitelisted IPs
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 200, -- Geofencing radius
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Users Table (Employees, Managers, Admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'employee')) DEFAULT 'employee',
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    office_id INTEGER REFERENCES offices(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Shifts Table
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- e.g., 'Regular Day Shift'
    start_time TIME NOT NULL,  -- e.g., '09:00:00'
    end_time TIME NOT NULL,    -- e.g., '17:00:00'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create User Shifts Assignment Table
CREATE TABLE user_shifts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL, -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, day_of_week)
);

-- Create Attendance Logs Table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    check_out_time TIME,
    check_in_ip VARCHAR(45) NOT NULL,
    check_out_ip VARCHAR(45),
    check_in_lat DOUBLE PRECISION,
    check_in_lng DOUBLE PRECISION,
    check_out_lat DOUBLE PRECISION,
    check_out_lng DOUBLE PRECISION,
    status VARCHAR(20) CHECK (status IN ('present', 'late', 'half_day', 'absent')) DEFAULT 'present',
    check_in_status VARCHAR(50) DEFAULT 'verified',  -- 'verified', 'bypassed_ip', 'bypassed_geo', etc.
    check_out_status VARCHAR(50) DEFAULT 'verified',
    UNIQUE(user_id, date)
);

-- Create Leaves Requests Table
CREATE TABLE leaves (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'unpaid', 'study', 'maternity')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
