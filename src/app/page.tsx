'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const session = localStorage.getItem('dashboard_session');
    if (session) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Por favor, ingresa una contraseña.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate network delay for premium feel
    setTimeout(() => {
      if (password === 'editor123') {
        localStorage.setItem(
          'dashboard_session',
          JSON.stringify({ role: 'editor', timestamp: Date.now() })
        );
        router.push('/dashboard');
      } else if (password === 'visual123') {
        localStorage.setItem(
          'dashboard_session',
          JSON.stringify({ role: 'viewer', timestamp: Date.now() })
        );
        router.push('/dashboard');
      } else {
        setError('Contraseña incorrecta. Inténtalo de nuevo.');
        setIsLoading(false);
      }
    }, 800);
  };

  if (!isMounted) {
    return null; // Prevents hydration flicker
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.loginCard} glass`}>
        {/* Social Media Logos Banner */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon} style={{ backgroundColor: '#1877F2' }} title="Facebook">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div 
            className={styles.logoIcon} 
            style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }} 
            title="Instagram"
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </div>
          <div className={styles.logoIcon} style={{ backgroundColor: '#000000', border: '1px solid rgba(255,255,255,0.1)' }} title="TikTok">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.22-.4-.45-.58-.7v5.13c.05 3.07-1.41 6.03-4.14 7.36-2.83 1.43-6.52 1.05-8.93-1.07-2.45-2.14-3.28-5.74-2.02-8.77C3.99 7.48 7.34 5.3 10.72 5.7c.2.02.4.06.6.1v4.09c-.89-.26-1.89-.2-2.7.25-.95.53-1.52 1.57-1.54 2.66-.02 1.55 1.25 2.91 2.8 2.91 1.49-.03 2.72-1.22 2.78-2.71.02-3.14.01-6.28.01-9.42-.01-.18-.09-.34-.15-.5z"/>
            </svg>
          </div>
          <div className={styles.logoIcon} style={{ backgroundColor: '#111' }} title="X">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Parrilla de Contenidos</h1>
          <p className={styles.subtitle}>Dashboard del Evento</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Contraseña de Acceso
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Ingresa la contraseña..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorMsg}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`${styles.button} ${isLoading ? styles.buttonDisabled : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Iniciando sesión...
              </>
            ) : (
              'Ingresar al Dashboard'
            )}
          </button>
        </form>

        <div className={styles.keyInfo}>
          <h2 className={styles.keyTitle}>Contraseñas de Acceso (Demo)</h2>
          <div className={styles.keyList}>
            <div className={styles.keyItem}>
              <span className={styles.keyRole}>
                <span className={`${styles.dot} styles.dotEditor`} style={{ backgroundColor: '#10b981' }}></span>
                Editor (Completo)
              </span>
              <span className={styles.keyValue}>editor123</span>
            </div>
            <div className={styles.keyItem}>
              <span className={styles.keyRole}>
                <span className={`${styles.dot} styles.dotViewer`} style={{ backgroundColor: '#94a3b8' }}></span>
                Visualizador (Lectura)
              </span>
              <span className={styles.keyValue}>visual123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
