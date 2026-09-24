import { Clock } from 'lucide-react';
import styles from './MetricCard.module.css';

export default function MetricCard({
  title,
  value,
  unit = '',
  subtitle = '',
  status = null, // 'normal' | 'watch' | 'warning' | 'critical'
  icon: Icon = null,
  trend = null, // e.g. "+1.2% / hr"
  isRising = null,
  timestamp = null,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.title}>{title}</span>
        {Icon && <Icon size={16} className={styles.icon} />}
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value ?? '—'}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {(subtitle || trend || status) && (
        <div className={styles.bottomRow}>
          {status && (
            <span className={`${styles.statusDot} ${styles[status]}`} />
          )}
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {trend && (
            <span
              className={`${styles.trend} ${
                isRising === true
                  ? styles.trendUp
                  : isRising === false
                  ? styles.trendDown
                  : ''
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
      {timestamp && (
        <div className={styles.timestampRow}>
          <Clock size={11} className={styles.clockIcon} />
          <span>{timestamp}</span>
        </div>
      )}
    </div>
  );
}
