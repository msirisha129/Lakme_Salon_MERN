import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { toast } from 'react-hot-toast';

const Billing = () => {
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ planName: 'Starter', amount: '', status: 'success', transactionId: '', createdAt: new Date().toISOString().split('T')[0] });
  const [editId, setEditId] = useState(null);

  const plans = [
    { name: 'Free', price: 0, features: ['Limited voice agent calls (2/month)', 'Basic support'] }, // Added Free plan for display consistency
    { name: 'Starter', price: 999, features: ['2 voice agent calls limit removed', 'Email/SMS alerts', 'Basic support'] },
    { name: 'Growth', price: 2499, features: ['Everything in Starter', 'Premium AI responses', 'Priority support'] },
    { name: 'Premium', price: 4999, features: ['Everything in Growth', 'Dedicated stylist scheduling', '24/7 phone support'] }
  ];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('lakme_user') || '{}');
    if (user && user.role === 'admin') setIsAdmin(true);
    fetchBillingInfo();
    console.log("Billing mounted"); // Temporary log to verify component mounting
  }, []);

  const fetchBillingInfo = async () => {
    try {
      const { data } = await API.get('/billing/info');
      console.log("Billing Response:", data);

      setSubscription(data.subscription || null);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
  try {
    // Create Razorpay Order
    const { data: orderData } = await API.post("/billing/subscribe", {
      planName: plan.name,
      amount: plan.price,
    });

    if (!window.Razorpay) {
      toast.error("Razorpay SDK not loaded");
      return;
    }

    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Lakmé Salon",
      description: `${orderData.planName} Subscription`,
      order_id: orderData.order_id,

      handler: async function (response) {
        console.log("Payment Success:", response);

        // DON'T activate subscription here.
        // Wait for backend verification.

        try {
          const verificationResponse = await API.post("/billing/payment-verify", {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            planName: plan.name,
            amount: plan.price,
          });

          if (verificationResponse.data.success) {
            toast.success("Subscription activated!");
            await fetchBillingInfo();
          } else {
            toast.error("Payment verification failed");
          }
        } catch (verificationError) {
          console.error("Payment verification API error:", verificationError);
          toast.error("Payment verification failed");
        }
      },

      modal: {
        ondismiss: function () {
          toast.error("Payment cancelled");
        },
      },

      theme: {
        color: "#C9A84C",
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();

  } catch (err) {
    console.error(err);
    toast.error("Unable to start payment");
  }
};

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await API.put(`/billing/history/${editId}`, formData);
        toast.success('Record updated successfully');
      } else {
        await API.post('/billing/history', formData);
        toast.success('Record added successfully');
      }
      setIsFormOpen(false);
      setEditId(null);
      fetchBillingInfo();
    } catch (err) {
      toast.error('Failed to save record');
    }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setFormData({
      planName: item.planName || 'Starter',
      amount: item.amount || '',
      status: item.status || 'success',
      transactionId: item.transactionId || '',
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await API.delete(`/billing/history/${id}`);
      toast.success('Record deleted');
      fetchBillingInfo();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const downloadCSV = () => {
    if (!history.length) return toast.error('No history to download');
    let csv = "Date,Transaction ID,Plan,Amount,Status\n";
    history.forEach(h => {
      csv += `"${new Date(h.createdAt).toLocaleDateString()}","${h.transactionId}","${h.planName}","₹${h.amount}","${h.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lakme_payment_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription?")) {
      return;
    }

    try {
      await API.post("/billing/cancel");
      toast.success("Subscription cancelled successfully");
      await fetchBillingInfo();
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel subscription");
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Subscriptions & Billing</h1>
        <p style={styles.subtitle}>Manage your plan and view transaction history</p>
      </div>

      {/* Current Plan Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Current Plan</h2>
        <div style={styles.currentPlanCard}>
          <div>
            <div style={styles.planName}>{subscription?.plan}</div>
            {subscription?.status === "active" && (
              <span style={styles.activeBadge}>Active</span>
            )}
          </div>
          <div style={styles.renewalDate}>
            Renewal Date: {
              subscription?.renewalDate
                ? new Date(subscription.renewalDate).toLocaleDateString("en-IN")
                : "Not Available"
            }
          </div>
          {subscription?.status === "active" &&
           subscription?.plan !== "Free" && (
            <button onClick={handleCancel} style={styles.cancelBtn}>
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Plan Selection */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Choose a Plan</h2>
        <div style={styles.planGrid}>
          {plans
            .filter((plan) => plan.name !== "Free")
            .map((plan) => (
            <div key={plan.name} style={Object.assign({}, styles.planCard, subscription?.plan === plan.name ? styles.planCardActive : {})}>
              <div style={styles.planCardHeader}>
                <h3 style={styles.planTitle}>{plan.name}</h3>
                <div style={styles.planPrice}>₹{plan.price}<span style={{fontSize: '14px', fontWeight: 400}}>/mo</span></div>
              </div>
              <ul style={styles.featureList}>
                {plan.features.map((f, i) => <li key={i} style={styles.featureItem}>✓ {f}</li>)}
              </ul>
              <button 
                disabled={subscription?.plan === plan.name && subscription?.status === 'active'}
                onClick={() => handleSubscribe(plan)}
                style={subscription?.plan === plan.name && subscription?.status === 'active' ? styles.btnActive : styles.btnSubscribe}
              >
                {subscription?.plan === plan.name && subscription?.status === 'active' ? 'Active Plan' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div style={styles.section}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2 style={styles.sectionTitle}>Payment History</h2>
          <div style={{display: 'flex', gap: '10px'}}>
            {isAdmin && (
              <button 
                onClick={() => { setEditId(null); setFormData({ planName: 'Starter', amount: '', status: 'success', transactionId: 'TXN'+Date.now(), createdAt: new Date().toISOString().split('T')[0] }); setIsFormOpen(!isFormOpen); }} 
                className="btn-primary" 
                style={{fontSize: '12px', padding: '8px 16px', background: 'var(--gold-dark)'}}
              >
                {isFormOpen ? 'Cancel' : '+ Add Manual Payment'}
              </button>
            )}
            <button onClick={downloadCSV} className="btn-primary" style={{fontSize: '12px', padding: '8px 16px'}}>Download CSV</button>
          </div>
        </div>

        {isAdmin && isFormOpen && (
          <form onSubmit={handleSaveRecord} style={styles.adminForm}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Plan Name</label>
                <select 
                  value={formData.planName} 
                  onChange={e => setFormData({...formData, planName: e.target.value})}
                  style={styles.input}
                >
                  {plans.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (₹)</label>
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  style={styles.input}
                >
                  <option value="success">success</option>
                  <option value="pending">pending</option>
                  <option value="failed">failed</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Transaction ID</label>
                <input 
                  type="text" 
                  value={formData.transactionId} 
                  onChange={e => setFormData({...formData, transactionId: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date</label>
                <input 
                  type="date" 
                  value={formData.createdAt} 
                  onChange={e => setFormData({...formData, createdAt: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{marginTop: '15px'}}>
              {editId ? 'Update Record' : 'Create Record'}
            </button>
          </form>
        )}

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={{background: 'var(--cream)'}}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Plan</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
                {isAdmin && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(history || []).map((item) => (
                <tr key={item._id || item.transactionId || Math.random()} style={{borderTop: '1px solid var(--border-light)'}}> {/* Added fallbacks for key */}
                  <td style={styles.td}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</td> {/* Added null-safety */}
                  <td style={styles.td}>{item.planName || 'N/A'}</td> {/* Added null-safety and changed to planName */}
                  <td style={Object.assign({}, styles.td, {color: 'var(--gold)', fontWeight: 600})}>₹{item.amount || '0'}</td> {/* Added null-safety */}
                  <td style={styles.td}>
                    <span style={{background: 'rgba(15,155,88,0.1)', color: '#0F9B58', padding: '4px 8px', borderRadius: '50px', fontSize: '11px', fontWeight: 600}}>
                      {item.status || 'N/A'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={styles.td}>
                      <button onClick={() => handleEdit(item)} style={styles.actionLink}>Edit</button>
                      <button onClick={() => handleDelete(item._id)} style={Object.assign({}, styles.actionLink, {color: 'var(--rose)'})}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: 'clamp(80px, 10vh, 100px) 24px 40px', // Adjusted padding-top for navbar and responsive spacing
    maxWidth: '1200px', margin: '0 auto'
  },
  header: { marginBottom: '40px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '8px' },
  subtitle: { color: 'var(--text-secondary)' },
  section: { marginBottom: '60px' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '24px' },
  currentPlanCard: { 
    background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px',
    flexDirection: 'column', // Stack vertically on small screens
    alignItems: 'flex-start', // Align items to the start when stacked
    wordBreak: 'break-word' // Prevent text overflow
  },
  planName: { fontSize: '24px', fontWeight: 600, color: 'var(--black)', display: 'inline-block', marginRight: '12px' },
  activeBadge: { background: 'rgba(15,155,88,0.1)', color: '#0F9B58', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 700, verticalAlign: 'middle' },
  renewalDate: { color: 'var(--text-secondary)', fontSize: '15px' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--rose)', color: 'var(--rose)', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }, // Adjusted minmax for better mobile stacking
  planCard: { 
    background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '32px',
    transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column',
    wordBreak: 'break-word' // Prevent text overflow
  },
  planCardActive: { borderColor: 'var(--gold)', boxShadow: '0 8px 30px rgba(201,168,76,0.15)', transform: 'translateY(-5px)' },
  planCardHeader: { borderBottom: '1px solid var(--border-light)', paddingBottom: '20px', marginBottom: '24px' },
  planTitle: { fontSize: '20px', fontWeight: 600, marginBottom: '8px' },
  planPrice: { fontSize: '32px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' },
  featureList: { listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 },
  featureItem: { color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px', wordBreak: 'break-word' }, // Prevent text overflow
  btnSubscribe: { 
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', 
    color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' 
  },
  btnActive: { 
    width: '100%', padding: '14px', background: 'var(--cream)', 
    color: 'var(--gold-dark)', border: '1px solid var(--gold)', borderRadius: '8px', fontWeight: 700, cursor: 'default' 
  },
  tableContainer: { background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }, // Added overflowX for horizontal scrolling
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap' }, // Prevent text wrapping
  td: { padding: '16px 20px', fontSize: '14px', whiteSpace: 'nowrap' }, // Prevent text wrapping
  adminForm: { background: 'var(--cream)', padding: '24px', borderRadius: '12px', marginBottom: '32px', border: '1px solid var(--border)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' },
  input: { padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '14px' },
  actionLink: { background: 'none', border: 'none', color: 'var(--gold-dark)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginRight: '12px', padding: 0 }
};

export default Billing;
