import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginBottom: '1rem' }}>
          Welcome, {user?.firstName}! 👋
        </h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Dashboard coming soon...
        </p>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;