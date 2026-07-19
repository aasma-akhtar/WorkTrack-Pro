import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Wifi, 
  CheckCircle, 
  XCircle, 
  Download, 
  Search, 
  RefreshCw,
  FileText
} from 'lucide-react';

export default function Attendance({ user, token }) {
  // Live ticking clock state
  const [time, setTime] = useState(new Date());
  
  // Attendance and logs state
  const [todayStatus, setTodayStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Helper to calculate hours worked
  const calculateHours = (checkInTime, checkOutTime) => {
    if (!checkInTime || !checkOutTime) return '--';
    
    const [inH, inM, inS] = checkInTime.split(':').map(Number);
    const [outH, outM, outS] = checkOutTime.split(':').map(Number);
    
    const inMinutes = inH * 60 + inM + inS / 60;
    const outMinutes = outH * 60 + outM + outS / 60;
    
    let diffMinutes = outMinutes - inMinutes;
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight shifts
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = Math.round(diffMinutes % 60);
    
    return `${hours}h ${minutes}m`;
  };
  
  // Exporter filters
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportEmployeeId, setExportEmployeeId] = useState('');

  // Manager filter controls
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Loading/feedback indicators
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    // Tick clock
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Initial data fetch
    fetchTodayStatus();
    fetchHistory();
    if (user.role !== 'employee') {
      fetchEmployees();
    }

    return () => clearInterval(timer);
  }, [filterEmployeeId, filterStartDate, filterEndDate]);

  // Fetch status of today's check-in/out
  const fetchTodayStatus = async () => {
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Employee dashboard contains todayStatus structure
        if (user.role === 'employee') {
          setTodayStatus(data.todayStatus);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch employee list for filters (Managers/Admins)
  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/auth/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch personal or team history
  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      let url = '/api/attendance/my-history';
      
      if (user.role !== 'employee') {
        url = `/api/attendance/team-history?`;
        const params = [];
        if (filterEmployeeId) params.push(`employeeId=${filterEmployeeId}`);
        if (filterStartDate) params.push(`startDate=${filterStartDate}`);
        if (filterEndDate) params.push(`endDate=${filterEndDate}`);
        url += params.join('&');
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Clock-in / Clock-out Action handler
  const handleClockAction = async (action) => {
    setIsLoading(true);
    setActionMessage(null);

    // Read developer simulator configurations
    const simConfig = JSON.parse(localStorage.getItem('dev_simulator_config')) || {
      simulatedIp: '127.0.0.1',
      latitude: 28.6139,
      longitude: 77.2090,
      bypassVerification: false
    };

    try {
      const url = action === 'in' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(simConfig),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to check ${action}`);
      }

      setActionMessage({ type: 'success', text: data.message });
      fetchTodayStatus();
      fetchHistory();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Export report downloader
  const handleExport = () => {
    let url = `/api/reports/export?month=${exportMonth}&format=${exportFormat}`;
    if (user.role !== 'employee' && exportEmployeeId) {
      url += `&employeeId=${exportEmployeeId}`;
    }

    // Direct browser file download using authentication token
    // Since browser downloads don't support Bearer headers naturally,
    // we fetch the file and create a temporary anchor element.
    setIsLoading(true);
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async (response) => {
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to download report.');
      }
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract file format extension
      const ext = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
      a.download = `Report_${exportMonth}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch((err) => {
      alert(`Report export failed: ${err.message}`);
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div>
      <div className="dashboard-sections" style={{ marginBottom: '32px' }}>
        
        {/* LEFT COLUMN: CLOCKING TERMINAL (Employee only) */}
        {user.role === 'employee' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Attendance Console
            </h2>

            <div style={{
              background: '#090514',
              border: '2px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '50%',
              width: '180px',
              height: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '28px',
              boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.6)'
            }}>
              <Clock size={28} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <span style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
                {formattedTime}
              </span>
            </div>

            {/* Check-in / Out action button */}
            {!todayStatus?.checkedIn ? (
              <button 
                onClick={() => handleClockAction('in')}
                className="btn-primary pulse-btn"
                style={{ width: '100%', maxWidth: '240px', padding: '16px 24px', fontSize: '16px', borderRadius: '50px' }}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Clock In Today'}
              </button>
            ) : !todayStatus?.checkOutTime ? (
              <button 
                onClick={() => handleClockAction('out')}
                className="btn-primary"
                style={{ width: '100%', maxWidth: '240px', padding: '16px 24px', fontSize: '16px', borderRadius: '50px', background: 'linear-gradient(135deg, var(--danger) 0%, #a855f7 100%)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Clock Out Now'}
              </button>
            ) : (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
                borderRadius: '50px',
                padding: '12px 28px',
                fontWeight: '700',
                fontSize: '15px'
              }}>
                ✓ Work Shifts Logged
              </div>
            )}

            {/* Feedbacks notification */}
            {actionMessage && (
              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                width: '100%',
                background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                <span>{actionMessage.text}</span>
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: MONTHLY REPORT EXPORTER (All roles) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Export Monthly Sheets</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Compile your monthly attendance summaries to Excel spreadsheet or print-ready PDF logs.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select Employee (Admin/Manager only) */}
              {user.role !== 'employee' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Employee Target</label>
                  <select 
                    className="form-input"
                    value={exportEmployeeId}
                    onChange={(e) => setExportEmployeeId(e.target.value)}
                    style={{ background: '#090514' }}
                  >
                    <option value="">Yourself</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Select Month</label>
                  <input 
                    type="month" 
                    className="form-input" 
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    style={{ background: '#090514' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Format Type</label>
                  <select 
                    className="form-input" 
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{ background: '#090514' }}
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="excel">Excel Workbook</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleExport}
            className="btn-primary" 
            style={{ width: '100%', padding: '14px', marginTop: '24px' }}
            disabled={isLoading}
          >
            <Download size={18} />
            <span>Generate Report File</span>
          </button>
        </div>
      </div>

      {/* LOWER SECTION: ATTENDANCE HISTORY LIST */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '18px' }}>
            {user.role === 'employee' ? 'My Check-in Log History' : 'Team Attendance Records'}
          </h2>
          
          <button 
            onClick={fetchHistory}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters Panel for Managers/Admins */}
        {user.role !== 'employee' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            background: '#090514',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Employee</label>
              <select 
                className="form-input"
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                style={{ padding: '8px', fontSize: '13px', background: 'var(--bg-primary)' }}
              >
                <option value="">All Direct Reports</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Start Date</label>
              <input 
                type="date"
                className="form-input"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                style={{ padding: '8px', fontSize: '13px', background: 'var(--bg-primary)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>End Date</label>
              <input 
                type="date"
                className="form-input"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                style={{ padding: '8px', fontSize: '13px', background: 'var(--bg-primary)' }}
              />
            </div>
          </div>
        )}

        {/* History Table */}
        {isHistoryLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading historical records...</p>
        ) : history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No attendance logs found matching filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  {user.role !== 'employee' && <th style={{ padding: '12px' }}>Employee</th>}
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Check In</th>
                  <th style={{ padding: '12px' }}>Check Out</th>
                  <th style={{ padding: '12px' }}>Hours Worked</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>IP Address</th>
                  <th style={{ padding: '12px' }}>Network Verification</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {user.role !== 'employee' && (
                      <td style={{ padding: '12px', fontWeight: '600' }}>
                        {row.employee_name || 'Self'}
                      </td>
                    )}
                    <td style={{ padding: '12px' }}>
                      {String(row.date).split('T')[0]}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {row.check_in_time}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      {row.check_out_time || '--:--:--'}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                      {calculateHours(row.check_in_time, row.check_out_time)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge badge-${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {row.check_in_ip}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', textTransform: 'capitalize', color: 'var(--text-dim)' }}>
                      {row.check_in_status || 'verified'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
