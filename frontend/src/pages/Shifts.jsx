import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Check, Send, UserCheck, Plus } from 'lucide-react';

const WEEKDAYS = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 }
];

export default function Shifts({ user, token }) {
  // Lists
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teamAssignments, setTeamAssignments] = useState([]);

  // Create Template form
  const [newShiftName, setNewShiftName] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00:00');
  const [newEndTime, setNewEndTime] = useState('17:00:00');

  // Assign shift form
  const [assignUserId, setAssignUserId] = useState('');
  const [assignShiftId, setAssignShiftId] = useState('');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // default Mon-Fri

  // Loading/Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSchedule, setIsFetchingSchedule] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
    fetchTeamAssignments();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/shifts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setShifts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/auth/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data);
        if (data.length > 0) {
          const firstEmployeeId = String(data[0].id);
          setAssignUserId(firstEmployeeId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeamAssignments = async (employeeId = '') => {
    try {
      let url = '/api/shifts/team-shifts';
      if (employeeId) {
        url += `?employeeId=${employeeId}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTeamAssignments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserSchedule = (() => {
    let activeRequest = 0;
    return async (userId) => {
      if (!userId) {
        setSelectedDays([]);
        return;
      }

      const requestId = ++activeRequest;
      setIsFetchingSchedule(true);

      try {
        const res = await fetch(`/api/shifts/team-shifts?employeeId=${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && requestId === activeRequest) {
          const days = Array.from(new Set(data.map((row) => Number(row.day_of_week))));
          setSelectedDays(days.length > 0 ? days : []);
        } else if (requestId === activeRequest) {
          setSelectedDays([]);
        }
      } catch (err) {
        console.error(err);
        if (requestId === activeRequest) {
          setSelectedDays([]);
        }
      } finally {
        if (requestId === activeRequest) {
          setIsFetchingSchedule(false);
        }
      }
    };
  })();

  useEffect(() => {
    if (assignUserId) {
      fetchUserSchedule(assignUserId);
    }
  }, [assignUserId]);

  // Create Shift Template
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newShiftName,
          start_time: newStartTime,
          end_time: newEndTime
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create shift.');
      }

      setNewShiftName('');
      fetchShifts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Assign Shift
  const handleAssignShift = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!assignUserId || !assignShiftId || selectedDays.length === 0) {
      alert('Please select an employee, shift template, and at least one weekday.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/shifts/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: parseInt(assignUserId, 10),
          shift_id: parseInt(assignShiftId, 10),
          days: selectedDays
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to assign shift.');
      }

      alert('Shift assigned successfully!');
      await fetchTeamAssignments();
      await fetchUserSchedule(assignUserId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle day selections
  const handleDayToggle = (dayValue) => {
    setSelectedDays(prev => 
      prev.includes(dayValue) 
        ? prev.filter(d => d !== dayValue) 
        : [...prev, dayValue]
    );
  };

  // Pre-fill shift option
  useEffect(() => {
    if (shifts.length > 0 && !assignShiftId) {
      setAssignShiftId(shifts[0].id);
    }
  }, [shifts]);

  // Group team assignments by employee name for roster view
  const groupedAssignments = teamAssignments.reduce((acc, row) => {
    const name = row.employee_name;
    if (!acc[name]) {
      acc[name] = {
        name,
        role: row.employee_role,
        shifts: {}
      };
    }
    acc[name].shifts[row.day_of_week] = `${row.shift_name} (${row.start_time} - ${row.end_time})`;
    return acc;
  }, {});

  return (
    <div>
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '10px',
          padding: '12px',
          color: 'var(--danger)',
          fontSize: '13px',
          marginBottom: '24px'
        }}>
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-sections" style={{ marginBottom: '32px' }}>
        
        {/* LEFT CARD: ASSIGN SHIFT FORM */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Calendar color="var(--primary)" size={20} />
            <h2 style={{ fontSize: '18px' }}>Assign Weekly Shifts</h2>
          </div>

          <form onSubmit={handleAssignShift}>
            <div className="form-group">
              <label className="form-label">Select Employee</label>
              <select 
                className="form-input"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                style={{ background: '#090514' }}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
              {isFetchingSchedule ? (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span className="loading-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1s infinite' }} />
                  <span>Loading schedule...</span>
                </div>
              ) : null}
            </div>

            <div className="form-group">
              <label className="form-label">Shift Template</label>
              <select 
                className="form-input"
                value={assignShiftId}
                onChange={(e) => setAssignShiftId(e.target.value)}
                style={{ background: '#090514' }}
              >
                <option value="">-- Choose Shift template --</option>
                {shifts.map(sh => (
                  <option key={sh.id} value={sh.id}>{sh.name} ({sh.start_time} - {sh.end_time})</option>
                ))}
              </select>
            </div>

            {/* Weekdays checkboxes */}
            <div className="form-group">
              <label className="form-label">Schedule Days</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#090514', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '12px' }}>
                {WEEKDAYS.map(day => (
                  <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: isFetchingSchedule ? 'not-allowed' : 'pointer', opacity: isFetchingSchedule ? 0.7 : 1 }}>
                    <input 
                      type="checkbox"
                      checked={selectedDays.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                      disabled={isFetchingSchedule}
                      style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                    />
                    <span>{day.name}</span>
                  </label>
                ))}
                {isFetchingSchedule && (
                  <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Please wait while the schedule loads.
                  </p>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px' }}
              disabled={isLoading || isFetchingSchedule}
            >
              <UserCheck size={16} />
              <span>{isLoading ? 'Saving...' : isFetchingSchedule ? 'Loading...' : 'Update Schedule'}</span>
            </button>
          </form>
        </div>

        {/* RIGHT CARD: CREATE SHIFT TEMPLATE (Admin only) */}
        {user.role === 'admin' ? (
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Clock color="var(--primary)" size={20} />
              <h2 style={{ fontSize: '18px' }}>Create Shift Template</h2>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="form-group">
                <label className="form-label">Shift Label</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Regular Evening Shift"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  required
                  style={{ background: '#090514' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="HH:MM:SS"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    required
                    style={{ background: '#090514' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="HH:MM:SS"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    required
                    style={{ background: '#090514' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px' }}
                disabled={isLoading}
              >
                <Plus size={16} />
                <span>Save Template</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-dim)', padding: '40px' }}>
            <div>
              <Clock size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: '500' }}>Shift Template Creator Restricted</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Only Global Administrators can add new shift templates.</p>
            </div>
          </div>
        )}
      </div>

      {/* LOWER SECTION: TEAM SCHEDULE MATRIX ROSTER */}
      <div className="glass-card">
        <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Weekly Shift Assignments Roster</h2>

        {Object.keys(groupedAssignments).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No weekly shifts assigned yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px', width: '150px' }}>Employee</th>
                  {WEEKDAYS.map(day => (
                    <th key={day.value} style={{ padding: '12px' }}>{day.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(groupedAssignments).map((empRow, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px' }}>
                      <p style={{ fontWeight: '700' }}>{empRow.name}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{empRow.role}</p>
                    </td>
                    {WEEKDAYS.map(day => (
                      <td key={day.value} style={{ padding: '12px', fontSize: '11px' }}>
                        {empRow.shifts[day.value] ? (
                          <div style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.15)',
                            borderRadius: '6px',
                            padding: '6px',
                            color: '#c084fc',
                            fontWeight: '600',
                            maxWidth: '120px'
                          }}>
                            {empRow.shifts[day.value].split(' ')[0]} {/* Label only */}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>Off</span>
                        )}
                      </td>
                    ))}
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
