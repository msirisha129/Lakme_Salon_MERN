import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import AIAssistantSection from './components/AIAssistantSection';
import Home from './pages/Home';
import Services from './pages/Services';
import Booking from './pages/Booking';
import Hairstyle from './pages/Hairstyle';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" />;
};

function AppContent() {
  const [openChatbot, setOpenChatbot] = useState(false);
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home onOpenChat={() => setOpenChatbot(true)} />} />
        <Route path="/services" element={<Services />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/hairstyle" element={<Hairstyle />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <Chatbot
  externalOpen={openChatbot}
  onExternalOpenHandled={() => setOpenChatbot(false)}
/>

      {/* ── Floating WhatsApp (right) ── */}
      <a
        href="https://wa.me/919876543210?text=Hi%20Lak%C3%A9%20Salon!%20I%27d%20like%20to%20book%20an%20appointment."
        target="_blank"
        rel="noreferrer"
        title="Chat on WhatsApp"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 999,
          width: 54, height: 54, borderRadius: '50%',
          background: '#25D366',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,211,102,0.45)',
          transition: 'transform 0.25s, box-shadow 0.25s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,211,102,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,211,102,0.45)'; }}
      >
        <svg width="26" height="26" viewBox="0 0 32 32" fill="white">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.655 4.821 1.797 6.84L2 30l7.36-1.77A13.94 13.94 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.44 11.44 0 01-5.82-1.587l-.418-.247-4.368 1.05 1.084-4.25-.272-.435A11.462 11.462 0 014.5 16C4.5 9.649 9.649 4.5 16 4.5S27.5 9.649 27.5 16 22.351 27.5 16 27.5zm6.29-8.61c-.344-.172-2.036-1.004-2.352-1.118-.316-.115-.546-.172-.776.172-.23.344-.89 1.118-1.09 1.348-.2.23-.4.258-.744.086-.344-.172-1.452-.535-2.766-1.707-1.022-.913-1.712-2.04-1.912-2.384-.2-.344-.022-.53.15-.701.155-.155.344-.4.516-.6.172-.2.23-.344.344-.573.115-.23.058-.43-.029-.602-.086-.172-.776-1.87-1.063-2.562-.28-.672-.564-.58-.776-.591l-.66-.012c-.23 0-.602.086-.917.43-.316.344-1.205 1.176-1.205 2.868s1.234 3.328 1.406 3.558c.172.23 2.428 3.71 5.882 5.203.822.355 1.464.567 1.964.726.825.263 1.576.226 2.17.137.662-.099 2.036-.832 2.323-1.635.287-.803.287-1.49.2-1.635-.086-.143-.316-.23-.66-.4z"/>
        </svg>
      </a>

      {/* ── Floating Call (left) ── */}
      <a
        href="tel:+919876543210"
        title="Call Us"
        style={{
          position: 'fixed', bottom: 28, left: 28, zIndex: 999,
          width: 54, height: 54, borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366, #1aad52)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,211,102,0.45)',
          transition: 'transform 0.25s, box-shadow 0.25s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,211,102,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,211,102,0.45)'; }}    
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </a>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'var(--font-body)', fontSize: 13 },
          success: { iconTheme: { primary: 'var(--gold)', secondary: 'white' } },
        }}
      />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}