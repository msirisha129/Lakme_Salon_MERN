import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { toast } from 'react-hot-toast';

const Billing = () => {
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const plans = [
    { name: 'Starter', price: 999, features: ['2 voice agent calls limit removed', 'Email/SMS alerts', 'Basic support'] },
    { name: 'Growth', price: 2499, features: ['Everything in Starter', 'Premium AI responses', 'Priority support'] },
    { name: 'Premium', price: 4999, features: ['Everything in Growth', 'Dedicated stylist scheduling', '24/7 phone support'] }
  ];

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      const { data } = await API.get('/billing/info');
      setSubscription(data.subscription);
      setHistory(data.history);
    } catch (err) {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    try {
      await API.post('/billing/subscribe', { planName: plan.name, amount: plan.price });
      toast.success(`Subscribed to ${plan.name} successfully!`);
      fetchBillingInfo();
    } catch (err) {
      toast.error('Subscription failed');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await API.post('/billing/cancel');
      toast.success('Subscription cancelled');
      fetchBillingInfo();
    } catch (err) {
      toast.error('Cancellation failed');
    }
  };

  const downloadCSV = () => {
    if (!history.length) return toast.error('No history to download');
    let csv = "Date,Transaction ID,Plan,Amount,Status\n";
    history.forEach(h => {
      csv += `"${new Date(h.createdAt).toLocaleDateString()}","${h.transactionId || "N/A"}","${h.planName || subscription?.plan || "Free"}","₹${h.amount}","${h.status || "Success"}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lakme_payment_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <div className="spinner"></div>;
   if (!subscription) {
  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h2>No Subscription Found</h2>
      <p>You are currently using the Free plan.</p>
    </div>
  );
}
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
            {subscription?.status === 'active' && <span style={styles.activeBadge}>Active</span>}
          </div>
          <div style={styles.renewalDate}>
  Renewal Date:{" "}
  {subscription?.renewalDate
    ? new Date(subscription.renewalDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not Available"}
</div>
          {subscription?.status === "active" &&
 subscription?.plan !== "Free" && (
            <button onClick={handleCancel} style={styles.cancelBtn}>Cancel Subscription</button>
          )}
        </div>
      </div>

      {/* Plan Selection */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Choose a Plan</h2>
        <div style={styles.planGrid}>
          {plans.map((plan) => (
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
          <button onClick={downloadCSV} className="btn-primary" style={{fontSize: '12px', padding: '8px 16px'}}>Download CSV</button>
        </div>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={{background: 'var(--cream)'}}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Transaction ID</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item._id} style={{borderTop: '1px solid var(--border-light)'}}>
                  <td style={styles.td}>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td style={styles.td}>{item.transactionId}</td>
                  <td style={Object.assign({}, styles.td, {color: 'var(--gold)', fontWeight: 600})}>₹{item.amount}</td>
                  <td style={styles.td}>
                    <span style={{background: 'rgba(15,155,88,0.1)', color: '#0F9B58', padding: '4px 8px', borderRadius: '50px', fontSize: '11px', fontWeight: 600}}>
                      {item.status}
                    </span>
                  </td>
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
  container: { padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '40px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '8px' },
  subtitle: { color: 'var(--text-secondary)' },
  section: { marginBottom: '60px' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '24px' },
  currentPlanCard: { 
    background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'
  },
  planName: { fontSize: '24px', fontWeight: 600, color: 'var(--black)', display: 'inline-block', marginRight: '12px' },
  activeBadge: { background: 'rgba(15,155,88,0.1)', color: '#0F9B58', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 700, verticalAlign: 'middle' },
  renewalDate: { color: 'var(--text-secondary)', fontSize: '15px' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--rose)', color: 'var(--rose)', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' },
  planCard: { 
    background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '32px',
    transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column'
  },
  planCardActive: { borderColor: 'var(--gold)', boxShadow: '0 8px 30px rgba(201,168,76,0.15)', transform: 'translateY(-5px)' },
  planCardHeader: { borderBottom: '1px solid var(--border-light)', paddingBottom: '20px', marginBottom: '24px' },
  planTitle: { fontSize: '20px', fontWeight: 600, marginBottom: '8px' },
  planPrice: { fontSize: '32px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' },
  featureList: { listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 },
  featureItem: { color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' },
  btnSubscribe: { 
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', 
    color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' 
  },
  btnActive: { 
    width: '100%', padding: '14px', background: 'var(--cream)', 
    color: 'var(--gold-dark)', border: '1px solid var(--gold)', borderRadius: '8px', fontWeight: 700, cursor: 'default' 
  },
  tableContainer: { background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', textAlign: 'left' },
  td: { padding: '16px 20px', fontSize: '14px' }
};

export default Billing;