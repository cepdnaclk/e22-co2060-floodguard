'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Waves, Activity } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.logo}>
          <Waves className={styles.logoIcon} />
          <span>FloodGuard</span>
        </Link>
        
        <div className={styles.navLinks}>
          <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}>
            Dashboard
          </Link>
          <Link href="/analytics" className={`${styles.navLink} ${pathname === '/analytics' ? styles.active : ''}`}>
            Analytics
          </Link>
        </div>

        {mounted && (
          <button 
            className={styles.themeToggle} 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
      </div>
    </nav>
  );
}
