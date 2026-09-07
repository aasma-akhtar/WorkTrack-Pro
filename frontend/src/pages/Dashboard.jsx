import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  PlaneTakeoff,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const sampleChartData = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));

  return {
    date: date.toISOString(),
    present: [6, 8, 7, 9, 8, 10, 7][index],
    late: [1, 1, 2, 1, 2, 1, 1][index],
    half_day: [1, 0, 1, 0, 0, 1, 0][index],
  };
});

export default function Dashboard({ user, token }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard data');
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div style={{ color: 'var(--text-muted)' }}>Loading analytics dashboard data...</div>;
  if (error) return <div style={{ color: 'var(--danger)' }}>Error loading stats: {error}</div>;
  if (!stats) return null;

  const chartData = stats.chart && stats.chart.length > 0 ? stats.chart : sampleChartData;
  const chartEmployeeCount = Math.max(Number(stats.totalEmployees) || 0, 10);

  return (
    <div>
      {/* 1. ADMIN DASHBOARD VIEW */}
      {user.role === 'admin' && (
        <div>
          <div className="stats-grid">
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Active Headcount</p>
                  <h3 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.totalEmployees}</h3>
                </div>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '12px' }}>
                  <Users size={20} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Offices Configured</p>
                  <h3 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.totalOffices}</h3>
                </div>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent)', padding: '10px', borderRadius: '12px' }}>
                  <Building2 size={20} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Clocked In Today</p>
                  <h3 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.checkedInToday}</h3>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px', borderRadius: '12px' }}>
                  <UserCheck size={20} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Pending Leaves</p>
                  <h3 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.pendingLeaves}</h3>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '10px', borderRadius: '12px' }}>
                  <PlaneTakeoff size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            {/* SVG Attendance Analytics Chart */}
            <div className="glass-card">
              <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>Attendance Activity (Last 7 Days)</h3>
              <div style={{ height: '220px', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 10px 30px 40px', borderBottom: '1px solid var(--glass-border)' }}>
                
                {/* Y-Axis helper lines */}
                <div style={{ position: 'absolute', left: 0, bottom: '30px', fontSize: '11px', color: 'var(--text-dim)' }}>0</div>
                <div style={{ position: 'absolute', left: 0, bottom: '110px', fontSize: '11px', color: 'var(--text-dim)' }}>50%</div>
                <div style={{ position: 'absolute', left: 0, bottom: '190px', fontSize: '11px', color: 'var(--text-dim)' }}>100%</div>
                
                {chartData.map((day, i) => {
                  const total = parseInt(day.present || 0) + parseInt(day.late || 0) + parseInt(day.half_day || 0);
                  const rate = (total / chartEmployeeCount) * 100;
                  const barHeight = Math.min(Math.max(rate * 1.8, 10), 180); // scale up height
                  const formattedDate = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });

                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                      {/* Styled bar */}
                      <div style={{
                        height: `${barHeight}px`,
                        width: '28px',
                        background: 'linear-gradient(to top, var(--primary), var(--accent))',
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 4px 10px var(--primary-glow)',
                        position: 'relative'
                      }}>
                        {/* Tooltip hover */}
                        <div style={{
                          position: 'absolute',
                          top: '-35px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'black',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          whiteSpace: 'nowrap',
                          zIndex: 10
                        }}>
                          {Math.round(rate)}% ({total})
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', position: 'absolute', bottom: '-22px' }}>
                        {formattedDate}
                      </span>
                    </div>
                  );
                  })}
              </div>
            </div>

            {/* Quick Administration list */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Administrative Actions</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>Global controls and monitoring</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Link to="/settings" style={actionBtnStyle}>
                    <span>Manage Office Locations</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link to="/shifts" style={actionBtnStyle}>
                    <span>Shift Scheduler</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link to="/attendance" style={actionBtnStyle}>
                    <span>Export Monthly Reports</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MANAGER DASHBOARD VIEW */}
      {user.role === 'manager' && (
        <div>
          <div className="stats-grid">
            <div className="glass-card">
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Team Members</p>
              <h3 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.teamSize}</h3>
            </div>
            
            <div className="glass-card">
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Clocked In Today</p>
              <h3 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.teamCheckedInToday}</h3>
            </div>

            <div className="glass-card">
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Pending Team Leaves</p>
              <h3 style={{ fontSize: '28px', marginTop: '8px' }}>{stats.teamPendingLeaves}</h3>
            </div>
          </div>

          <div className="dashboard-sections">
            {/* Active team members clocked in today */}
            <div className="glass-card">
              <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Active Team Attendance (Today)</h3>
              
              {stats.activeTeam && stats.activeTeam.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stats.activeTeam.map((member, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      padding: '12px 16px'
                    }}>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '14px' }}>{member.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Clock In: {member.check_in_time} {member.check_out_time ? `| Clock Out: ${member.check_out_time}` : ''}
                        </p>
                      </div>
                      <span className={`badge badge-${member.status}`}>
                        {member.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No team members clocked in today yet.</p>
              )}
            </div>

            {/* Link to leave approval requests */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Leave Approvals</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>You have {stats.teamPendingLeaves} pending leave requests waiting for your approval.</p>
                <Link to="/leaves" className="btn-primary" style={{ textDecoration: 'none' }}>
                  <span>Review Requests</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EMPLOYEE DASHBOARD VIEW */}
      {user.role === 'employee' && (
        <div>
          <div className="stats-grid">
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Monthly Presence</p>
                  <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
                    {stats.monthlyStats?.total || 0} <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Days</span>
                  </h3>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px', borderRadius: '12px' }}>
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Late Check-ins</p>
                  <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
                    {stats.monthlyStats?.late || 0} <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Days</span>
                  </h3>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '10px', borderRadius: '12px' }}>
                  <AlertTriangle size={20} />
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Approved Leaves</p>
                  <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
                    {stats.leavesTaken || 0} <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Days</span>
                  </h3>
                </div>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent)', padding: '10px', borderRadius: '12px' }}>
                  <PlaneTakeoff size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            {/* Today status & check-in console */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Today's Clock Status</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
                  Verify your office credentials and log status
                </p>

                {stats.todayStatus?.checkedIn ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status Today</p>
                          <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>
                            ✓ Clocked In ({stats.todayStatus.status.toUpperCase()})
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '24px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Check-in:</span>
                          <span style={{ marginLeft: '6px', fontWeight: '700' }}>{stats.todayStatus.checkInTime}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Check-out:</span>
                          <span style={{ marginLeft: '6px', fontWeight: '700' }}>{stats.todayStatus.checkOutTime || '--:--:--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: '600', fontSize: '15px' }}>Not Clocked In Yet</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', marginBottom: '16px' }}>Please head to the Attendance page to clock in.</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px' }}>
                <Link to="/attendance" className="btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
                  <span>Open Clocking Terminal</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Active Shift schedule details */}
            <div className="glass-card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Active Shift Schedule</h3>
              {stats.shift ? (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <p style={{ fontWeight: '700', fontSize: '16px', color: 'var(--primary)' }}>{stats.shift.shift_name}</p>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Hours:</span>
                      <span style={{ marginLeft: '6px', fontWeight: '700' }}>{stats.shift.start_time} - {stats.shift.end_time}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No shift scheduled for today.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--glass-border)',
  borderRadius: '12px',
  padding: '16px',
  textDecoration: 'none',
  color: 'white',
  fontWeight: '600',
  fontSize: '14px',
  transition: 'background 0.2s, transform 0.2s'
};
