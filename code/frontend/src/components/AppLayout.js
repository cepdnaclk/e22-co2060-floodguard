'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import styles from './AppLayout.module.css';

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className={styles.loginWrapper}>{children}</main>;
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.container}>{children}</div>
      </main>
    </div>
  );
}
