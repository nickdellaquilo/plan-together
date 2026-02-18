import React from 'react';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            Plan Together
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Authentication ready! Pages coming next...
          </p>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;