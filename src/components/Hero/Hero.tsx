import Link from 'next/link';
import { about } from '@/data/about';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className={styles.hero}>
      {/* 左侧：标题 + 介绍 + CTA */}
      <div className={styles.content}>
        <h1 className={styles.headline}>
          <span className={styles.headlineRow}>
            THINK<span className={styles.dot} style={{ background: 'transparent' }}>.</span>
          </span>
          <span className={styles.headlineRow}>
            BUILD<span className={`${styles.dot} ${styles.dotBlue}`} />
          </span>
          <span className={styles.headlineRow}>
            SHIP<span className={`${styles.dot} ${styles.dotGreen}`} />
          </span>
        </h1>

        <p className={styles.bio}>{about.bio}</p>

        <Link href="/work" className={styles.cta}>
          Explore my work
          <span className={styles.ctaArrow} aria-hidden="true">→</span>
        </Link>

        <div className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>{about.status}</span>
        </div>
      </div>

      {/* 右侧：Canvas 已经在全局 layout 中挂载，这里只保留装饰元素 */}
      <div className={styles.canvasArea}>
        <div className={styles.coords} aria-hidden="true">
          X: 284<br />
          Y: 128
          <span className={styles.coordsCrosshair}>+</span>
        </div>

        <div className={styles.systemStatus} aria-hidden="true">
          <div className={styles.systemStatusLabel}>System Status</div>
          <div className={styles.systemStatusValue}>Active</div>
        </div>
      </div>
    </section>
  );
}
