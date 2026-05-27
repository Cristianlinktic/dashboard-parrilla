import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const role = password === 'editor' ? 'editor' : 'viewer';
    const session = { role };
    localStorage.setItem('dashboard_session', JSON.stringify(session));
    router.replace('/dashboard');
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h2 className={styles.title}>Iniciar Sesión</h2>
        <label className={styles.label}>Contraseña (viewer/editor)</label>
        <input
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ingrese la contraseña"
          required
        />
        <button type="submit" className={styles.btn}>Entrar</button>
      </form>
    </div>
  );
}
