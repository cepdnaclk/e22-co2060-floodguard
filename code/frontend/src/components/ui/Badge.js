import styles from './Badge.module.css';

export default function Badge({ variant = 'default', children, className = '' }) {
  const variantClass = styles[variant] || styles.default;
  return (
    <span className={`${styles.badge} ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
