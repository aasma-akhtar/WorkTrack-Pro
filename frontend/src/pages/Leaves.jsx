import React, { useState, useEffect } from 'react';
import { PlaneTakeoff, Check, X, ClipboardList, Send, MessageSquare } from 'lucide-react';

export default function Leaves({ user, token }) {
  // Apply leave form state
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  
  // Lists
  const [myLeaves, setMyLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  
  // Review comments mapping
  const [comments, setComments] = useState({});

  // Loading/message indicators
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchMyLeaves();
    if (user.role !== 'employee') {
      fetchPendingLeaves();
    }
  }, []);

  const fetchMyLeaves = async () => {
    try {
      const res = await fetch('/api/leaves/my-leaves', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setMyLeaves(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingLeaves = async () => {
    try {
      const res = await fetch('/api/leaves/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setPendingLeaves(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit leave application
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/leaves/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit leave request.');
      }

      setMessage({ type: 'success', text: 'Leave request submitted successfully!' });
      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchMyLeaves();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Approve / Reject review handler
  const handleReviewLeave = async (id, status) => {
    setIsLoading(true);
    const leaveComments = comments[id] || '';

    try {
      const res = await fetch(`/api/leaves/review/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, comments: leaveComments })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to process request.');
      }

      fetchPendingLeaves();
      fetchMyLeaves(); // In case manager approves their own
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle comments editing
  const handleCommentChange = (id, text) => {
    setComments(prev => ({ ...prev, [id]: text }));
  };

  return (
    <div>
      <div className="dashboard-sections" style={{ marginBottom: '32px' }}>
        
        {/* LEFT CARD: LEAVE APPLICATION FORM (Employee only) */}
        {user.role === 'employee' && (
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <PlaneTakeoff color="var(--primary)" size={20} />
              <h2 style={{ fontSize: '18px' }}>Apply for Leave</h2>
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

            <form onSubmit={handleApplyLeave}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select 
                  className="form-input" 
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  style={{ background: '#090514' }}
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="study">Study Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{ background: '#090514' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    style={{ background: '#090514' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Comments</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  placeholder="Explain why you are applying for time off..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={{ background: '#090514', resize: 'vertical' }}
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px' }}
                disabled={isLoading}
              >
                <Send size={16} />
                <span>Submit Application</span>
              </button>
            </form>
          </div>
        )}

        {/* RIGHT CARD: PENDING QUEUE LIST (Admin / Manager only) */}
        {user.role !== 'employee' && (
          <div className="glass-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <ClipboardList color="var(--primary)" size={20} />
              <h2 style={{ fontSize: '18px' }}>Leave Requests Approval Queue ({pendingLeaves.length})</h2>
            </div>

            {pendingLeaves.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No pending leave requests to review.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '15px' }}>{leave.employee_name}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{leave.employee_email}</p>
                      </div>
                      <span className="badge badge-pending">{leave.leave_type}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                        <span style={{ marginLeft: '6px', fontWeight: '700' }}>
                          {String(leave.start_date).split('T')[0]} to {String(leave.end_date).split('T')[0]}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                      <strong>Reason:</strong> {leave.reason}
                    </p>

                    {/* Review comments and action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '2px 8px' }}>
                        <MessageSquare size={14} color="var(--text-dim)" />
                        <input 
                          type="text" 
                          placeholder="Leave comments (optional)..."
                          value={comments[leave.id] || ''}
                          onChange={(e) => handleCommentChange(leave.id, e.target.value)}
                          style={{ background: 'none', border: 'none', width: '100%', outline: 'none', padding: '8px 0', fontSize: '12px' }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleReviewLeave(leave.id, 'approved')}
                          className="btn-primary"
                          style={{ background: 'var(--success)', boxShadow: 'none', padding: '10px 16px', borderRadius: '10px' }}
                          disabled={isLoading}
                        >
                          <Check size={16} />
                          <span>Approve</span>
                        </button>
                        <button 
                          onClick={() => handleReviewLeave(leave.id, 'rejected')}
                          className="btn-secondary"
                          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--danger)', padding: '10px 16px', borderRadius: '10px' }}
                          disabled={isLoading}
                        >
                          <X size={16} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LOWER SECTION: PERSONAL LEAVES TRACKING HISTORY */}
      {user.role === 'employee' && (
        <div className="glass-card">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Leave Request History</h2>
          
          {myLeaves.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No leave applications logged.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>Leave Type</th>
                    <th style={{ padding: '12px' }}>Start Date</th>
                    <th style={{ padding: '12px' }}>End Date</th>
                    <th style={{ padding: '12px' }}>Reason</th>
                    <th style={{ padding: '12px' }}>Reviewer</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Manager Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                        {row.leave_type}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {String(row.start_date).split('T')[0]}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {String(row.end_date).split('T')[0]}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {row.reason}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {row.reviewer_name || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${row.status}`}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '13px' }}>
                        {row.comments || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
