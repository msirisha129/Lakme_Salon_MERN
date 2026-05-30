import React, { useState, useEffect } from 'react';
import { BarChart2, Users, Calendar, DollarSign, Edit2, Trash2, Plus, X, Check } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TABS = ['Dashboard', 'Bookings', 'Services', 'Users', 'Logs'];
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
  const [sForm, setSForm] = useState({ name: '', category: 'Hair', description: '', price: '', duration: '', popular: false });
  const [loading, setLoading] = useState(false);
  const [logTab, setLogTab] = useState('booking');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    const [st, bk, sv] = await Promise.allSettled([
      API.get('/admin/stats'), API.get('/bookings/admin/all'), API.get('/services')
    ]);
    if (st.status === 'fulfilled') setStats(st.value.data.data || {});
    if (bk.status === 'fulfilled') setBookings(bk.value.data.data || []);
    if (sv.status === 'fulfilled') setServices(sv.value.data.data || []);
  };

  const updateBookingStatus = async (id, status) => {
    await API.put(`/bookings/${id}/status`, { status });
    setBookings(b => b.map(x => x._id === id ? { ...x, status } : x));
    toast.success('Status updated');
  };

  const saveService = async () => {
    setLoading(true);
    try {
      if (editService) {
        const { data } = await API.put(`/services/${editService._id}`, sForm);
        setServices(s => s.map(x => x._id === editService._id ? data.data : x));
        toast.success('Service updated ✅');
        setEditService(null);
      } else {
        const { data } = await API.post('/services', sForm);
        setServices(s => [...s, data.data]);
        toast.success('Service created ✅');
        setNewService(false);
      }
      setSForm({ name: '', category: 'Hair', description: '', price: '', duration: '', popular: false });
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
    setLogs(data.data || []);
  } catch (err) {
    toast.error('Failed to load logs');
  } finally {
    setLogsLoading(false);
  }
};

const downloadLogs = (type) => {
  if (!logs.length) { toast.error('No logs to download'); return; }
  
  let csv = '';
  if (type === 'booking') {
    csv = 'Date,Customer,Email,Service,Amount,Status,Booked Via\n';
    logs.forEach(l => {
      csv += `"${new Date(l.createdAt).toLocaleDateString('en-IN')}","${l.user?.name || ''}","${l.user?.email || ''}","${l.service?.name || ''}","₹${l.totalAmount || 0}","${l.status || ''}","${l.bookedVia || 'website'}"\n`;
    });
  } else if (type === 'user') {
    csv = 'Date,Name,Email,Phone,Role,Loyalty Points\n';
    logs.forEach(l => {
      csv += `"${new Date(l.createdAt).toLocaleDateString('en-IN')}","${l.name || ''}","${l.email || ''}","${l.phone || ''}","${l.role || ''}","${l.loyaltyPoints || 0}"\n`;
    });
  } else if (type === 'error' || type === 'app') {
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
      <div style={{ background: 'white', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 72, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '16px 28px', fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--gold)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: 0.5
            }}>{t}</button>
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
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }}>{s.description?.slice(0, 50)}...</div>
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
                onClick={() => downloadLogs(logTab)}
                style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                ⬇ Download CSV
              </button>
            </div>

            {/* Log category tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { key: 'booking', label: '📊 Booking Logs', color: '#4A90D9' },
                { key: 'user',    label: '👤 User Logs',    color: '#8B5CF6' },
                { key: 'error',   label: '🔴 Error Logs',   color: '#C8003B' },
                { key: 'app',     label: '⚙️ App Logs',     color: '#0F9B58' },
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
              ))}
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
                      {logTab === 'booking' && ['Date', 'Customer', 'Email', 'Service', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                      ))}
                      {logTab === 'user' && ['Date', 'Name', 'Email', 'Phone', 'Role', 'Points'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                      ))}
                      {(logTab === 'error' || logTab === 'app') && ['Time', 'Level', 'Message', 'Details'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logTab === 'booking' && logs.map((l, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{l.user?.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{l.user?.email}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{l.service?.name}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', color: 'var(--gold)' }}>₹{l.totalAmount?.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: `${S_COLORS[l.status]}15`, color: S_COLORS[l.status], fontSize: 10, padding: '4px 8px', borderRadius: 50, fontWeight: 600 }}>{l.status}</span>
                        </td>
                      </tr>
                    ))}
                    {logTab === 'user' && logs.map((l, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{l.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{l.email}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>{l.phone}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: l.role === 'admin' ? 'rgba(201,168,76,0.1)' : 'rgba(74,144,217,0.1)', color: l.role === 'admin' ? 'var(--gold)' : '#4A90D9', fontSize: 10, padding: '4px 8px', borderRadius: 50, fontWeight: 600 }}>{l.role}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#8B5CF6', fontWeight: 600 }}>{l.loyaltyPoints || 0} pts</td>
                      </tr>
                    ))}
                    {(logTab === 'error' || logTab === 'app') && logs.map((l, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(l.timestamp).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: l.level === 'error' ? 'rgba(200,0,59,0.1)' : 'rgba(15,155,88,0.1)', color: l.level === 'error' ? '#C8003B' : '#0F9B58', fontSize: 10, padding: '4px 8px', borderRadius: 50, fontWeight: 600 }}>{l.level}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{l.message}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
