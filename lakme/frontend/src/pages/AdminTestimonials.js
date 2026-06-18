import React, { useEffect, useState } from 'react';
import API from '../utils/api';
import { Link } from 'react-router-dom';

function TestimonialCard({ t, onEdit, onDelete }) {
  return (
    <div style={{ border: '1px solid var(--border-light)', padding: 16, borderRadius: 8, background: 'white' }}>
      <div style={{ fontWeight: 700 }}>{t.name} <span style={{ color: 'var(--gold)', marginLeft: 8 }}>{t.service}</span></div>
      <div style={{ marginTop: 8 }}>{t.text}</div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button className="btn-outline" onClick={() => onEdit(t)}>Edit</button>
        <button className="btn-primary" onClick={() => onDelete(t._id)}>Delete</button>
      </div>
    </div>
  );
}

export default function AdminTestimonials() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const fetch = () => {
    setLoading(true);
    const path = showPendingOnly ? '/testimonials?approved=false' : '/testimonials';
    API.get(path).then(r => { setItems(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [showPendingOnly]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    await API.delete(`/testimonials/${id}`);
    fetch();
  };

  const handleSave = async (data) => {
    if (editing) {
      await API.put(`/testimonials/${editing._id}`, data);
      setEditing(null);
    } else {
      await API.post('/testimonials', data);
    }
    fetch();
  };

  return (
    <div className="container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2>Manage Testimonials</h2>
        <Link to="/admin" className="btn-outline">Back to Admin</Link>
      </div>

      <div style={{ marginBottom: 20 }}>
        <TestimonialEditor key={editing?._id || 'new'} initial={editing} onCancel={() => setEditing(null)} onSave={handleSave} />
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={showPendingOnly} onChange={e => setShowPendingOnly(e.target.checked)} />
          Show pending only
        </label>
      </div>

      {loading ? <div>Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {items.map(i => (
            <TestimonialCard key={i._id} t={i} onEdit={(t) => setEditing(t)} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function TestimonialEditor({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', service: '', rating: 5, text: '', imageUrl: '', approved: true });
  useEffect(() => { if (initial) setForm({ ...initial }); else setForm({ name: '', service: '', rating: 5, text: '', imageUrl: '', approved: true }); }, [initial]);
  return (
    <div style={{ border: '1px solid var(--border-light)', padding: 16, borderRadius: 8, background: 'white' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="form-input" />
        <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} placeholder="Service" className="form-input" />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={!!form.approved} onChange={e => setForm({ ...form, approved: e.target.checked })} />
          Approved
        </label>
      </div>
      <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="Testimonial text" className="form-input" style={{ marginTop: 12 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="Image URL (optional)" className="form-input" />
        <input type="number" value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} min={1} max={5} className="form-input" style={{ width: 100 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn-primary" onClick={() => onSave(form)}>{initial ? 'Save' : 'Add'}</button>
        {initial && <button className="btn-outline" onClick={onCancel}>Cancel</button>}
        {initial && <button className="btn-primary" onClick={async () => { await API.put(`/testimonials/${initial._id}`, { ...initial, approved: true }); onCancel(); }}>Approve</button>}
      </div>
    </div>
  );
}
