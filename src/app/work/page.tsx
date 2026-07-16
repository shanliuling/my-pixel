import Link from 'next/link';
import { works } from '@/data/works';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Work — SPARK LAB',
  description: 'Selected projects and experiments.',
};

export default function WorkPage() {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        ← Back to home
      </Link>

      <h1 className={styles.title}>Work</h1>
      <p className={styles.subtitle}>Selected projects & experiments.</p>

      <div className={styles.list}>
        {works.map((work) => (
          <Link
            key={work.slug}
            href={`/work/${work.slug}`}
            className={styles.workLink}
          >
            <div className={styles.workHeader}>
              <h2 className={styles.workTitle}>{work.title}</h2>
              <span className={styles.workYear}>{work.year}</span>
            </div>
            <p className={styles.workDescription}>{work.description}</p>
            <div className={styles.tags}>
              {work.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
