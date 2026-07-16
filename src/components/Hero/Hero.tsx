import Link from 'next/link';
import { about } from '@/data/about';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className={styles.hero}>
      {/* 左侧：标题 + 介绍 + CTA */}
      <div className={styles.content}>
        <div className={styles.greeting}>
          <span className={styles.greetingIcon} aria-hidden="true">
            <span className={styles.greetingDot} />
            <span className={styles.greetingDot} />
            <span className={styles.greetingDot} />
            <span className={styles.greetingDot} />
          </span>
          <span>Hi, I'm Spark.</span>
        </div>

        <h1 className={styles.headline}>
          <span className={styles.headlineRow}>TURNING IDEAS</span>
          <span className={styles.headlineRow}>
            INTO <span className={styles.highlightBlue}>USEFUL</span>
          </span>
          <span className={styles.headlineRow}>
            SOFTWARE<span className={styles.dot} />
          </span>
        </h1>

        <p className={styles.bio}>
          I build digital products,<br/>
          experiment with code,<br/>
          and design intentional systems.
        </p>

        <Link href="/work" className={styles.cta}>
          EXPLORE MY WORK
          <span className={styles.ctaArrow} aria-hidden="true">→</span>
        </Link>
      </div>

      {/* 右侧：Canvas 已经在全局 layout 中挂载，这里作为占位和网格支撑 */}
      <div className={styles.canvasArea}>
        {/* 坐标指示器和系统状态已被移除 */}
      </div>
    </section>
  );
}
