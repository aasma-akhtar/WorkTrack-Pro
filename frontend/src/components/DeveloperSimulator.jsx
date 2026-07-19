import React, { useState, useEffect } from 'react';
import { Settings, Shield, Wifi, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

export default function DeveloperSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [ipType, setIpType] = useState('office'); // 'office' | 'home' | 'custom'
  const [customIp, setCustomIp] = useState('192.168.1.50');
  
  const [locationType, setLocationType] = useState('office'); // 'office' | 'home' | 'custom'
  const [customLat, setCustomLat] = useState('28.6139');
  const [customLng, setCustomLng] = useState('77.2090');
  
  const [bypass, setBypass] = useState(false);

  // Sync simulator configuration to localStorage so that API requests can fetch them
  useEffect(() => {
    const config = {
      simulatedIp: ipType === 'office' ? '192.168.1.50' : ipType === 'home' ? '203.0.113.12' : customIp,
      latitude: locationType === 'office' ? 28.6139 : locationType === 'home' ? 28.6448 : parseFloat(customLat || 0),
      longitude: locationType === 'office' ? 77.2090 : locationType === 'home' ? 77.2167 : parseFloat(customLng || 0),
      bypassVerification: bypass
    };
    localStorage.setItem('dev_simulator_config', JSON.stringify(config));
  }, [ipType, customIp, locationType, customLat, customLng, bypass]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      fontFamily: 'var(--font-body)',
      color: '#f3f4f6'
    }}>
      {/* Closed Mini Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="pulse-btn"
          style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '50px',
            width: '60px',
            height: '60px',
            cursor: 'pointer',
            display: 'flex',
            align: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
            color: 'white'
          }}
        >
          <Settings size={28} />
        </button>
      )}

      {/* Opened Simulator Panel */}
      {isOpen && (
        <div style={{
          width: '320px',
          background: 'rgba(15, 12, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#a855f7" />
              <span style={{ fontWeight: '700', fontSize: '14px', fontFamily: 'var(--font-display)' }}>Developer Simulator</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Quick Bypass Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            background: 'rgba(168,85,247,0.1)',
            padding: '10px',
            borderRadius: '8px',
            border: '1px dashed rgba(168, 85, 247, 0.3)'
          }}>
            <input 
              type="checkbox"
              checked={bypass}
              onChange={(e) => setBypass(e.target.checked)}
              style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
            />
            <span>Bypass IP & Geo Validation</span>
          </label>

          {!bypass && (
            <>
              {/* IP Whitelist Simulator */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#c084fc' }}>
                  <Wifi size={14} />
                  <span>Network IP Address</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', background: '#090514', padding: '3px', borderRadius: '8px' }}>
                  {['office', 'home', 'custom'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setIpType(t)}
                      style={{
                        flex: 1,
                        background: ipType === t ? 'rgba(168,85,247,0.2)' : 'none',
                        border: ipType === t ? '1px solid rgba(168,85,247,0.5)' : 'none',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {ipType === 'office' && <p style={{ fontSize: '11px', color: 'var(--success)', marginTop: '6px' }}>✓ Office IP (192.168.1.50) [Allowed]</p>}
                {ipType === 'home' && <p style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '6px' }}>✗ Home IP (203.0.113.12) [Blocked]</p>}
                {ipType === 'custom' && (
                  <input
                    type="text"
                    className="form-input"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    style={{ fontSize: '12px', padding: '6px', marginTop: '6px', background: '#090514' }}
                    placeholder="Enter custom IP"
                  />
                )}
              </div>

              {/* Geo-Location Simulator */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#c084fc' }}>
                  <MapPin size={14} />
                  <span>Physical GPS Location</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', background: '#090514', padding: '3px', borderRadius: '8px' }}>
                  {['office', 'home', 'custom'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setLocationType(t)}
                      style={{
                        flex: 1,
                        background: locationType === t ? 'rgba(168,85,247,0.2)' : 'none',
                        border: locationType === t ? '1px solid rgba(168,85,247,0.5)' : 'none',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {locationType === 'office' && <p style={{ fontSize: '11px', color: 'var(--success)', marginTop: '6px' }}>✓ At Office (0m away) [Allowed]</p>}
                {locationType === 'home' && <p style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '6px' }}>✗ Away at Home (5.4 km away) [Blocked]</p>}
                {locationType === 'custom' && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      style={{ fontSize: '11px', padding: '6px', flex: 1, background: '#090514' }}
                      placeholder="Latitude"
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      style={{ fontSize: '11px', padding: '6px', flex: 1, background: '#090514' }}
                      placeholder="Longitude"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
            WorkTrack Pro Evaluation Tool
          </div>
        </div>
      )}
    </div>
  );
}
