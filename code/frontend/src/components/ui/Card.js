import styles from './Card.module.css';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`${styles.card} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', action = null }) {
  return (
    <div className={`${styles.header} ${className}`}>
      <div className={styles.headerContent}>{children}</div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`${styles.title} ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }) {
  return <p className={`${styles.description} ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '', noPadding = false }) {
  return (
    <div className={`${styles.content} ${noPadding ? styles.noPadding : ''} ${className}`}>
      {children}
    </div>
  );
}
