import React, { useState, useEffect } from 'react';
import { BarChart2, Users, Calendar, DollarSign, Edit2, Trash2, Plus, X, Check } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminTestimonials from './AdminTestimonials';

const TABS = ['Dashboard', 'Bookings', 'Services', 'Testimonials', 'Logs', 'Analytics', 'Billing'];
const CATS = ['Hair', 'Skin', 'Nails', 'Bridal', 'Makeup', 'Spa'];

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Dashboard');
  const [stats, setStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [editService, setEditService] = useState(null);
  const [newService, setNewService] = useState(false);
  const [sForm, setSForm] = useState({ name: '', category: 'Hair', description: '', price: '', duration: '', popular: false, image: '' });
  const [sImage, setSImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logTab, setLogTab] = useState('booking');
  const [voiceStats, setVoiceStats] = useState({});
  const [voiceRows, setVoiceRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    if (tab === 'Billing') { navigate('/admin/billing'); return; }
    loadData();
  }, [user, tab]);

  const loadData = async () => {
    const [st, bk, sv] = await Promise.allSettled([
      API.get('/admin/stats'), API.get('/bookings/admin/all'), API.get('/services')
    ]);
    if (st.status === 'fulfilled') setStats(st.value.data.data || {});
    if (st.status === 'fulfilled' && st.value.data.data?.voice) setVoiceStats(st.value.data.data.voice || {});
    if (bk.status === 'fulfilled') setBookings(bk.value.data.data || []);
    if (sv.status === 'fulfilled') setServices(sv.value.data.data || []);
    // Ensure voice rows and logs are loaded for persistence across refresh
    try { loadVoiceLogs(1); } catch (e) { /* ignore */ }
    try { loadLogs('booking'); } catch (e) { /* ignore */ }
  };

  const updateBookingStatus = async (id, status) => {
    await API.put(`/bookings/${id}/status`, { status });
    setBookings(b => b.map(x => x._id === id ? { ...x, status } : x));
    toast.success('Status updated');
  };

  const saveService = async () => {
    setLoading(true);
    try {
      let imageUrl = sForm.image || '';
      if (sImage) {
        const formData = new FormData();
        formData.append('image', sImage);
        const { data: imgData } = await API.post('/services/upload-image', formData);
        imageUrl = imgData.url;
      }
      const payload = { ...sForm, image: imageUrl };
      if (editService) {
        const { data } = await API.put(`/services/${editService._id}`, payload);
        setServices(s => s.map(x => x._id === editService._id ? data.data : x));
        toast.success('Service updated ✅');
        setEditService(null);
      } else {
        const { data } = await API.post('/services', payload);
        setServices(s => [...s, data.data]);
        toast.success('Service created ✅');
        setNewService(false);
      }
      setSForm({ name: '', category: 'Hair', description: '', price: '', duration: '', popular: false, image: '' });
      setSImage(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    await API.delete(`/services/${id}`);
    setServices(s => s.filter(x => x._id !== id));
    toast.success('Deleted');
  };
  const loadLogs = async (type) => {
  setLogsLoading(true);
  try {
    const { data } = await API.get(`/admin/logs?type=${type}`);
      const raw = data.data || [];
      // Normalize different backend responses to a common log shape
      const normalized = raw.map(item => {
        // If it's a Log model entry (has timestamp & message)
        if (item.timestamp || item.message) {
          let details = item.details || '';
          if (details === '{}' || details.trim() === '') {
            details = ''; // Replace empty JSON object string or empty string with an empty string for cleaner display
          }
          return {
            timestamp: item.timestamp || item.createdAt || Date.now(),
            level: item.level || 'info', // Default level to 'info' if missing
            message: item.message || 'No message provided', // Ensure message exists
            details: details
          };
        }

        // Booking documents
        if (item.service || item.user || item.totalAmount !== undefined) {
          return {
            timestamp: item.createdAt || item.date || Date.now(),
            level: 'info',
            message: `${item.user?.name || 'Unknown'} booked ${item.service?.name || 'service'}`,
            details: `Amount: ${item.totalAmount || item.service?.price || ''} | ${item.service?.category || ''}`
          };
        }

        // User documents
        if (item.email && item.role) {
          return {
            timestamp: item.createdAt || Date.now(),
            level: 'info',
            message: `${item.name} (${item.email})`,
            details: `Role: ${item.role} ${item.phone ? `| ${item.phone}` : ''}`
          };
        }

        // Fallback: stringify
        return {
          timestamp: item.createdAt || Date.now(),
          level: item.level || 'info',
          message: item.message || JSON.stringify(item),
          details: item.details || ''
        };
      });

      setLogs(normalized || []);
  } catch (err) {
    toast.error('Failed to load logs');
  } finally {
    setLogsLoading(false);
  }
};

const loadVoiceLogs = async (page = 1) => {
  try {
    const { data } = await API.get(`/admin/call-logs/list?page=${page}&limit=50`);
    if (data.success) {
      setVoiceRows(data.data.rows || []);
    }
  } catch (e) {
    toast.error('Failed to load voice logs');
  }
};

const downloadLogs = (type) => {
  if (!logs.length) { toast.error('No logs to download'); return; }
  
  let csv = '';
  if (type === 'booking') {
    csv = 'Timestamp,Level,Message,Details\n';
    logs.forEach(l => {
      csv += `"${new Date(l.timestamp).toLocaleString('en-IN')}","${l.level || ''}","${l.message || ''}","${l.details || ''}"\n`;
    });
  } else if (type === 'email') {
    csv = 'Timestamp,Level,Message,Details\n';
    logs.forEach(l => {
      csv += `"${new Date(l.timestamp).toLocaleString('en-IN')}","${l.level || ''}","${l.message || ''}","${l.details || ''}"\n`;
    });
  } else if (type === 'voice') {
    csv = 'Timestamp,Level,Message,Details\n';
    logs.forEach(l => {
      csv += `"${new Date(l.timestamp).toLocaleString('en-IN')}","${l.level || ''}","${l.message || ''}","${l.details || ''}"\n`;
    });
  } else if (type === 'user') {
    csv = 'Timestamp,Level,Message,Details\n';
    logs.forEach(l => {
      csv += `"${new Date(l.timestamp).toLocaleString('en-IN')}","${l.level || ''}","${l.message || ''}","${l.details || ''}"\n`;
    });
  } else if (type === 'error' || type === 'app' || type === 'security') {
    csv = 'Timestamp,Level,Message,Details\n';
    logs.forEach(l => {
      csv += `"${new Date(l.timestamp).toLocaleString('en-IN')}","${l.level || ''}","${l.message || ''}","${l.details || ''}"\n`;
    });
  }
  else if (type === 'app') {
    csv = 'Timestamp,Level,Message,Details\n';
    logs.forEach(l => {
      csv += `"${new Date(l.timestamp).toLocaleString('en-IN')}","${l.level || ''}","${l.message || ''}","${l.details || ''}"\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lakme_${type}_logs_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${type} logs downloaded!`);
};

  const openEdit = (s) => {
    setEditService(s);
    setSForm({ name: s.name, category: s.category, description: s.description, price: s.price, duration: s.duration, popular: s.popular });
  };

  const statCards = [
    { label: 'Total Bookings', val: stats.totalBookings || 0, icon: <Calendar size={20} />, color: '#4A90D9' },
    { label: 'Confirmed', val: stats.confirmedBookings || 0, icon: <Check size={20} />, color: '#0F9B58' },
    { label: 'Total Clients', val: stats.totalUsers || 0, icon: <Users size={20} />, color: '#8B5CF6' },
    { label: 'Revenue', val: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: <DollarSign size={20} />, color: 'var(--gold)' },
  ];

  const STATUS_OPTS = ['pending', 'confirmed', 'completed', 'cancelled'];
  const S_COLORS = { confirmed: '#4A90D9', pending: '#F5A623', completed: '#0F9B58', cancelled: '#C8003B' };

  return (
    <div style={{ paddingTop: 72, minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{ background: 'linear-gradient(135deg, #0A0A0A, #1A1A3E)', padding: '40px 0' }}>
        <div className="container">
          <span style={{ fontSize: 11, letterSpacing: 4, color: 'var(--gold)', textTransform: 'uppercase' }}>Admin Panel</span>
          <h1 style={{ color: 'white', fontSize: 'clamp(1.6rem, 3vw, 2.5rem)', marginTop: 8 }}>Lakmé Salon Dashboard</h1>
        
        
        
        </div>

      </div>

      {/* Tabs */}
<div
  style={{
    background: 'white',
    borderBottom: '1px solid var(--border-light)',
    position: 'sticky',
    top: 72,
    zIndex: 100
  }}
>
  <div className="container" style={{ display: 'flex', gap: 0 }}>
    {TABS.map(t => (
      <button
        key={t}
        onClick={() => {
          if (t === "Billing") {
            navigate("/admin/billing");
          } else {
            setTab(t);
          }
        }}
        style={{
          padding: '16px 28px',
          fontSize: 13,
          fontWeight: tab === t ? 600 : 400,
          color: tab === t ? 'var(--gold)' : 'var(--text-secondary)',
          borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
          background: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          letterSpacing: 0.5
        }}
      >
        {t}
      </button>
    ))}
  </div>
</div>

      <div className="container" style={{ padding: '32px 24px' }}>

        {/* DASHBOARD */}
        {tab === 'Dashboard' && (
          <div>
            <div className="grid-4" style={{ marginBottom: 40 }}>
                {statCards.map((s, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 12, padding: '24px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: 0.5, marginTop: 4 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Voice summary cards */}
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 12 }}>Voice Assistant</h3>
            <div className="grid-4" style={{ marginBottom: 24 }}>
              <div style={{ background: 'white', borderRadius: 12, padding: '18px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{voiceStats.totalCalls || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Calls</div>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: '18px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{voiceStats.totalMinutes || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Minutes</div>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: '18px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{voiceStats.totalUsers || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Users</div>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: '18px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{voiceStats.successfulCalls || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Successful Calls</div>
              </div>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 20 }}>Recent Bookings</h3>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)' }}>
                    {['Client', 'Service', 'Date', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats.recentBookings || []).map((b, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>{b.user?.name}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>{b.service?.name}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(b.date || b.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '14px 20px', fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>₹{b.service?.price?.toLocaleString()}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: `${S_COLORS[b.status]}15`, color: S_COLORS[b.status], fontSize: 11, padding: '4px 10px', borderRadius: 50, fontWeight: 600 }}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOOKINGS */}
        {tab === 'Bookings' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 20 }}>All Appointments ({bookings.length})</h3>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)' }}>
                    {['Client', 'Service', 'Date & Time', 'Stylist', 'Amount', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b._id} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{b.user?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.user?.phone}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{b.service?.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(b.date).toLocaleDateString('en-IN')}<br />{b.timeSlot}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>{b.stylist}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>₹{b.totalAmount?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: `${S_COLORS[b.status]}15`, color: S_COLORS[b.status], fontSize: 10, padding: '4px 8px', borderRadius: 50, fontWeight: 600 }}>{b.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <select value={b.status} onChange={e => updateBookingStatus(b._id, e.target.value)} style={{ fontSize: 12, padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: 6, cursor: 'pointer', background: 'white' }}>
                          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SERVICES */}
        {tab === 'Services' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>Services ({services.length})</h3>
              <button onClick={() => { setNewService(true); setEditService(null); setSForm({ name: '', category: 'Hair', description: '', price: '', duration: '', popular: false }); }} className="btn-primary" style={{ fontSize: 12 }}>
                <Plus size={14} /> Add Service
              </button>
            </div>

            {/* Service form */}
            {(newService || editService) && (
              <div style={{ background: 'white', borderRadius: 12, padding: '28px', border: '1px solid var(--border)', marginBottom: 24, boxShadow: 'var(--shadow-gold)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>{editService ? 'Edit' : 'Add'} Service</h4>
                <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Service Name</label>
                    <input className="form-input" placeholder="e.g. Signature Haircut" value={sForm.name} onChange={e => setSForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category</label>
                    <select className="form-input" value={sForm.category} onChange={e => setSForm(f => ({ ...f, category: e.target.value }))}>
                      {CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Price (₹)</label>
                    <input className="form-input" type="number" placeholder="999" value={sForm.price} onChange={e => setSForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Duration (minutes)</label>
                    <input className="form-input" type="number" placeholder="60" value={sForm.duration} onChange={e => setSForm(f => ({ ...f, duration: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={sForm.description} onChange={e => setSForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'none' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Service Image</label>
                  {(sForm.image || editService?.image) && (
                    <div style={{ marginBottom: 8 }}>
                      <img src={sForm.image || editService?.image} alt="service" 
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginRight: 8 }} />
                      <button type="button" onClick={() => setSForm(f => ({ ...f, image: '' }))} 
                        style={{ fontSize: 11, color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Remove Image
                      </button>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={e => setSImage(e.target.files[0])} 
                    style={{ fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <input type="checkbox" id="popular" checked={sForm.popular} onChange={e => setSForm(f => ({ ...f, popular: e.target.checked }))} />
                  <label htmlFor="popular" style={{ fontSize: 13, cursor: 'pointer' }}>Mark as Popular</label>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setNewService(false); setEditService(null); }} className="btn-outline" style={{ fontSize: 12 }}><X size={12} /> Cancel</button>
                  <button onClick={saveService} disabled={loading} className="btn-primary" style={{ fontSize: 12 }}><Check size={12} /> {loading ? 'Saving...' : 'Save Service'}</button>
                </div>
              </div>
            )}

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)' }}>
                    {['Service', 'Category', 'Price', 'Duration', 'Popular', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s._id} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
                        <img src={s.image} alt={s.name} 
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, marginRight: 8, verticalAlign: 'middle' }} 
                          onError={e => e.target.style.display='none'} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }}>{s.description?.slice(0, 50)}...</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><span className="badge badge-gold">{s.category}</span></td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.1rem' }}>₹{s.price?.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.duration} min</td>
                      <td style={{ padding: '12px 16px' }}>{s.popular ? '⭐' : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(s)} style={{ padding: '6px', background: 'rgba(74,144,217,0.1)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#4A90D9' }}><Edit2 size={14} /></button>
                          <button onClick={() => deleteService(s._id)} style={{ padding: '6px', background: 'rgba(200,0,59,0.1)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--rose)' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* LOGS */}
        {tab === 'Logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>System Logs</h3>
              <button
                onClick={() => downloadLogs(logTab, logs)}
                style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                ⬇ Download CSV
              </button>
            </div>

            {/* Log category tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {
                [
                  { key: 'booking', label: '📊 Booking Logs', color: '#4A90D9' },
                  { key: 'email',   label: '📧 Email Logs',   color: '#F5A623' },
                  { key: 'voice',   label: '🎤 Voice Logs',   color: '#0F9B58' },
                  { key: 'user',    label: '👤 User Logs',    color: '#8B5CF6' },
                  { key: 'error',   label: '🔴 Error Logs',   color: '#C8003B' },
                  { key: 'app',     label: '⚙️ App Logs',     color: '#6B7280' },
                  { key: 'security',label: '🔒 Security Logs', color: '#FFD700' },
                ].map(lt => (
                  <button
                    key={lt.key}
                    onClick={() => { setLogTab(lt.key); loadLogs(lt.key); }}
                    style={{
                      padding: '10px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: logTab === lt.key ? lt.color : 'white',
                      color: logTab === lt.key ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${logTab === lt.key ? lt.color : 'var(--border-light)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    {lt.label}
                  </button>
                ))
              }
            </div>

            {/* Log content */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'auto' }}>
              {logsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading logs...</div>
              ) : logs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Click a log category above to view logs
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--cream)' }}>
                      {['Time', 'Level', 'Message', 'Details'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: l.level === 'error' ? 'rgba(200,0,59,0.1)' : l.level === 'warn' ? 'rgba(245,166,35,0.1)' : 'rgba(15,155,88,0.1)',
                            color: l.level === 'error' ? '#C8003B' : l.level === 'warn' ? '#F5A623' : '#0F9B58',
                            fontSize: 10, padding: '4px 8px', borderRadius: 50, fontWeight: 600
                          }}>{l.level}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{l.message}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'Analytics' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 20 }}>Voice Call Logs</h3>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'auto', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)' }}>
                    {['Date','User','Email','Plan','Call Type','Duration (mins)','Status','Service','Trials'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {voiceRows.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px 16px' }}>{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}>{r.name}</td>
                      <td style={{ padding: '12px 16px' }}>{r.email}</td>
                      <td style={{ padding: '12px 16px' }}>{r.plan}</td>
                      <td style={{ padding: '12px 16px' }}>{r.callType}</td>
                      <td style={{ padding: '12px 16px' }}>{r.durationMinutes}</td>
                      <td style={{ padding: '12px 16px' }}>{r.status}</td>
                      <td style={{ padding: '12px 16px' }}>{r.serviceName}</td>
                      <td style={{ padding: '12px 16px' }}>{r.voiceTrialsUsed ? `${r.voiceTrialsUsed}/2` : '0/2'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
