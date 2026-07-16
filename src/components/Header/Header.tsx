import Link from 'next/link';
import { about } from '@/data/about';
import styles from './Header.module.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Stack', href: '/stack' },
  { label: 'Notes', href: '/notes' },
  { label: 'Work', href: '/work' },
] as const;

export function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        {/* 像素风小 Logo：3x2 方块阵列，缺两个角 */}
        <span className={styles.brandIcon} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        SPARK LAB
      </Link>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.navLink}
          >
            {item.label}
          </Link>
        ))}
        <a
          href={about.github}
          className={`${styles.navLink} ${styles.external}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
          <span className={styles.externalArrow} aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}
