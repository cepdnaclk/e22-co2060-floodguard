'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Waves, Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(name.trim(), password);
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Authentication failed. Check credentials.');
      }
    } catch {
      setError('Network or system error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoUser) => {
    setName(demoUser);
    setPassword('floodguard123');
    setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badgeRow}>
            <span className={styles.portalTag}>Official Portal</span>
            <span className={styles.divisionTag}>Irrigation Department</span>
          </div>
          <div className={styles.brandRow}>
            <div className={styles.brandIcon}>
              <Waves size={24} />
            </div>
            <div>
              <h1 className={styles.title}>FloodGuard</h1>
              <p className={styles.subtitle}>Reservoir Early-Warning & Decision Support</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Engineer / Officer Name</label>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.fieldIcon} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Admin or Officer Name"
                className={styles.input}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Access Key / Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.fieldIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={styles.input}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <span>Verifying credentials...</span>
            ) : (
              <>
                <span>Sign In to Station</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className={styles.demoSection}>
          <div className={styles.demoHeader}>
            <Shield size={13} />
            <span>Authorized Test Profiles</span>
          </div>
          <div className={styles.demoButtons}>
            <button
              type="button"
              onClick={() => handleQuickFill('Admin')}
              className={styles.demoBtn}
            >
              Admin (Global)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('Kumara Bandara')}
              className={styles.demoBtn}
            >
              Chief Engineer
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('K. L. Jayasinghe')}
              className={styles.demoBtn}
            >
              Shift Engineer
            </button>
          </div>
          <p className={styles.demoHint}>
            Default key for all seed profiles: <code>floodguard123</code>
          </p>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Restricted access. All session events are cryptographically audited.</p>
        </div>
      </div>
    </div>
  );
}
