import { useState, useEffect } from 'react';
import { LoginForm, SignupForm } from './AuthForms';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal({ isOpen, onClose, authMode = 'login', message }) {
  const [mode, setMode] = useState(authMode);
  const { user } = useAuth();
  
  useEffect(() => {
    setMode(authMode);
  }, [authMode]);
  
  // Close modal if user logs in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="modalOverlay">
      <div className="authModal">
        <button className="modalCloseButton" onClick={onClose}>×</button>
        
        {message && <div className="authModalMessage">{message}</div>}
        
        {mode === 'login' ? (
          <LoginForm 
            onSuccess={onClose} 
            onToggleView={() => setMode('signup')} 
          />
        ) : (
          <SignupForm 
            onSuccess={onClose} 
            onToggleView={() => setMode('login')} 
          />
        )}
      </div>
    </div>
  );
} 