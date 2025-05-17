import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginForm({ onSuccess, onToggleView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signIn(email, password);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authFormContainer">
      <h2>Log In</h2>
      
      {error && <div className="errorMessage">{error}</div>}
      
      <form onSubmit={handleSubmit} className="authForm">
        <div className="formGroup">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="formGroup">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" className="authButton" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      <p className="authToggle">
        Don't have an account?{' '}
        <button onClick={onToggleView} className="authToggleButton">
          Sign Up
        </button>
      </p>
    </div>
  );
}

export function SignupForm({ onSuccess, onToggleView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signUp(email, password);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authFormContainer">
      <h2>Create an Account</h2>
      
      {error && <div className="errorMessage">{error}</div>}
      
      <form onSubmit={handleSubmit} className="authForm">
        <div className="formGroup">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="formGroup">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <small>Password must be at least 6 characters</small>
        </div>
        
        <button type="submit" className="authButton" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      
      <p className="authToggle">
        Already have an account?{' '}
        <button onClick={onToggleView} className="authToggleButton">
          Log In
        </button>
      </p>
    </div>
  );
} 