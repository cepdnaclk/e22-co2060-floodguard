'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Activity,
  CloudRain,
  Clock,
  Shield,
  LogOut,
  ChevronDown,
  Waves,
  Circle,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/monitoring', label: 'Live Monitoring', icon: Activity },
  { href: '/rainfall', label: 'Rainfall Stations', icon: CloudRain },
  { href: '/history', label: 'Historical Data', icon: Clock },
  { href: '/control', label: 'Control Panel', icon: Shield, authRequired: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, dams, selectedDamId, setSelectedDamId, connectionStatus, logout } = useApp();

  // Don't show sidebar on login page
  if (pathname === '/login') return null;

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <Waves size={22} />
        <div>
          <div className={styles.logoTitle}>FloodGuard</div>
          <div className={styles.logoSub}>Reservoir Early-Warning System</div>
        </div>
      </div>

      {/* Dam selector */}
      <div className={styles.damSelector}>
        <label className={styles.selectorLabel}>Active Reservoir</label>
        <div className={styles.selectWrapper}>
          <select
            value={selectedDamId}
            onChange={(e) => setSelectedDamId(e.target.value)}
            className={styles.select}
          >
            {dams.map((dam) => (
              <option key={dam.dam_id} value={dam.dam_id}>
                {dam.dam_name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          if (item.authRequired && !user) return null;

          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        {/* Connection status */}
        <div className={styles.statusRow}>
          <Circle
            size={8}
            fill={connectionStatus === 'online' ? 'var(--status-green)' : 'var(--status-orange)'}
            stroke="none"
          />
          <span className={styles.statusText}>
            {connectionStatus === 'online' ? 'System Online' : 'Connection Issue'}
          </span>
        </div>

        {/* User session */}
        {user ? (
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userRole}>{user.role}</div>
            </div>
            <button onClick={logout} className={styles.logoutBtn} title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link href="/login" className={styles.loginLink}>
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
