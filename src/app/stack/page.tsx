import Link from 'next/link';
import { stack } from '@/data/stack';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stack — SPARK LAB',
  description: 'Technologies and tools I use to build products.',
};

export default function StackPage() {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        ← Back to home
      </Link>

      <h1 className={styles.title}>Stack</h1>
      <p className={styles.subtitle}>Technologies & tools I use daily.</p>

      <div className={styles.grid}>
        {stack.map((category) => (
          <section key={category.name} className={styles.category}>
            <h2 className={styles.categoryName}>{category.name}</h2>
            <div className={styles.items}>
              {category.items.map((item) => (
                <span key={item} className={styles.item}>
                  {item}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
