'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { about } from '@/data/about';
import { announceHeroScene } from '@/components/Hero/heroScene';
import styles from './Header.module.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Stack', href: '/stack' },
  { label: 'Notes', href: '/notes' },
  { label: 'Work', href: '/work' },
] as const;

const homeNavItems = [
  { label: 'Work', href: '/work' },
  { label: 'Writing', href: '/notes' },
  { label: 'About', href: '/about' },
  { label: 'Notes', href: '/notes' },
] as const;

export function Header() {
  const pathname = usePathname();
  const showAboutPreview = () => announceHeroScene('about');
  const hideAboutPreview = () => announceHeroScene('landscape');

  if (pathname === '/') {
    return (
      <header className={`${styles.header} ${styles.homeHeader}`}>
        <Link href="/" className={styles.homeBrand} aria-label="Spark home">
          SP<span>.</span>
        </Link>

        <nav className={`${styles.nav} ${styles.homeNav}`}>
          {homeNavItems.map((item) => {
            const previewsAbout = item.label === 'About';

            return (
              <Link
                key={item.label}
                href={item.href}
                className={styles.homeNavLink}
                onPointerEnter={
                  previewsAbout ? showAboutPreview : undefined
                }
                onPointerLeave={
                  previewsAbout ? hideAboutPreview : undefined
                }
                onFocus={
                  previewsAbout ? showAboutPreview : undefined
                }
                onBlur={
                  previewsAbout ? hideAboutPreview : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/about" className={styles.contactButton}>
          Get in touch
          <span aria-hidden="true">↗</span>
        </Link>
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
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
          <Link key={item.href} href={item.href} className={styles.navLink}>
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
          <span className={styles.externalArrow} aria-hidden="true">
            ↗
          </span>
        </a>
      </nav>
    </header>
  );
}
