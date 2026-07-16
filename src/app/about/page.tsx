import Link from 'next/link';
import { about } from '@/data/about';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `About — ${about.name}`,
  description: about.tagline,
};

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        ← Back to home
      </Link>

      <h1 className={styles.title}>{about.name}</h1>
      <p className={styles.tagline}>{about.tagline}</p>

      <p className={styles.bio}>{about.bio}</p>

      <div className={styles.status}>
        <span className={styles.statusDot} />
        {about.status}
      </div>

      <div>
        <a
          href={about.github}
          className={styles.githubLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          → GitHub
        </a>
      </div>
    </div>
  );
}
