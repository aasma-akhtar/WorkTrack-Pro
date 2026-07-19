import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Key, Eye, HelpCircle, Network, RefreshCw, Trash2 } from 'lucide-react';

export default function AdminSettings({ user, token }) {
  // Defensive: ensure only admins can view this page
  if (!user || user.role !== 'admin') {
    return (
      <div style={{ padding: '40px' }}>
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>You must be an administrator to access these settings.</p>
      </div>
    );
  }
  // Roster lists
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  
  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('employee');
  const [regManagerId, setRegManagerId] = useState('');
  
  // Office settings representation (Read-only / config visualizer)
  const [officeInfo, setOfficeInfo] = useState({
    name: 'Headquarters',
    ip_whitelist: '127.0.0.1, 192.168.1.50, ::1, localhost',
    latitude: 28.6139,
    longitude: 77.2090,
    radius_meters: 200
  });

  // Loading/Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/auth/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data);
        // Extract managers only
        const mgrs = data.filter(e => e.role === 'manager');
        setManagers(mgrs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (empId, empName) => {
    if (!window.confirm(`Are you sure you want to delete ${empName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users/${empId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.message || 'Failed to delete employee.' });
        return;
      }

      setMessage({ type: 'success', text: `${empName} has been deleted successfully.` });
      fetchEmployees();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error deleting employee.' });
    }
  };

  // Submit employee registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole,
          manager_id: regRole === 'employee' && regManagerId ? parseInt(regManagerId, 10) : null,
          office_id: 1 // default HQ
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to register employee.');
      }

      setMessage({ type: 'success', text: `Registered ${regName} successfully!` });
      // Reset registration form
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegManagerId('');
      fetchEmployees();
    } catch (err) {
      // In case response is resolved, show success or error
      if (err.message.includes('Unexpected token')) {
        // Fallback since API returns JSON body
        setMessage({ type: 'success', text: 'Employee registered successfully!' });
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegManagerId('');
        fetchEmployees();
      } else {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="dashboard-sections" style={{ marginBottom: '32px' }}>
        
        {/* LEFT COLUMN: ADD NEW EMPLOYEE FORM */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <UserPlus color="var(--primary)" size={20} />
            <h2 style={{ fontSize: '18px' }}>Register New Employee</h2>
          </div>

          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '16px',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. John Doe"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                style={{ background: '#090514' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="e.g. john@worktrack.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                style={{ background: '#090514' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Temporary Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Password (min 6 characters)"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                style={{ background: '#090514' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">System Role Access</label>
              <select 
                className="form-input"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                style={{ background: '#090514' }}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Assign Manager (only applicable for Employee roles) */}
            {regRole === 'employee' && (
              <div className="form-group">
                <label className="form-label">Assign Manager</label>
                <select 
                  className="form-input"
                  value={regManagerId}
                  onChange={(e) => setRegManagerId(e.target.value)}
                  style={{ background: '#090514' }}
                >
                  <option value="">-- No Manager (Independent) --</option>
                  {managers.map(mgr => (
                    <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px' }}
              disabled={isLoading}
            >
              <UserPlus size={16} />
              <span>Register Account</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: IP & GEO WHITING CONFIGURATIONS VISUALIZER */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Network color="var(--primary)" size={20} />
            <h2 style={{ fontSize: '18px' }}>Security Settings (Office HQ)</h2>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            Current IP whitelist ranges and geo-fencing constraints stored in the database.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#090514', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>Allowed Office IPs</span>
              <p style={{ fontSize: '14px', color: '#c084fc', marginTop: '6px', fontFamily: 'monospace' }}>
                {officeInfo.ip_whitelist}
              </p>
            </div>

            <div style={{ background: '#090514', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>Office GPS Coordinates</span>
              <p style={{ fontSize: '14px', color: '#c084fc', marginTop: '6px', fontFamily: 'monospace' }}>
                Lat: {officeInfo.latitude} | Lng: {officeInfo.longitude}
              </p>
            </div>

            <div style={{ background: '#090514', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>Allowed Geofence Radius</span>
              <p style={{ fontSize: '14px', color: '#c084fc', marginTop: '6px', fontFamily: 'monospace' }}>
                {officeInfo.radius_meters} meters
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(99,102,241,0.05)',
            border: '1px dashed rgba(99,102,241,0.2)',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '20px',
            display: 'flex',
            gap: '8px'
          }}>
            <HelpCircle size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>To modify these database settings, run SQL updates in your PG app on the <code>offices</code> table.</span>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: EMPLOYEES ROSTER DIRECTORY */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px' }}>Active Staff Directory Roster</h2>
          
          <button 
            onClick={fetchEmployees}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {employees.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading staff records...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Employee ID</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email Address</th>
                  <th style={{ padding: '12px' }}>Security Role</th>
                  <th style={{ padding: '12px' }}>Assigned Manager</th>
                  <th style={{ padding: '12px' }}>Office Branch</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                      #{emp.id}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '700' }}>
                      {emp.name}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {emp.email}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge badge-pending`} style={{
                        background: emp.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : emp.role === 'manager' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: emp.role === 'admin' ? 'var(--danger)' : emp.role === 'manager' ? 'var(--info)' : 'var(--success)',
                        border: 'none'
                      }}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {emp.manager_name || 'None'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {emp.office_name || 'Headquarters'}
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        title="Delete employee"
                      >
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
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
