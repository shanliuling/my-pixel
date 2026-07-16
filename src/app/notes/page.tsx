import Link from 'next/link';
import { notes } from '@/data/notes';
import styles from './page.module.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notes — SPARK LAB',
  description: 'Thoughts on AI, development, and building products.',
};

/** 颜色映射：将 NoteItem.color 转换为 CSS 变量 */
const colorMap: Record<string, string> = {
  blue: 'var(--blue)',
  red: 'var(--red)',
  yellow: 'var(--yellow)',
  green: 'var(--green)',
};

export default function NotesPage() {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        ← Back to home
      </Link>

      <h1 className={styles.title}>Notes</h1>
      <p className={styles.subtitle}>
        Thoughts on AI, development, and building products.
      </p>

      <div className={styles.list}>
        {notes.map((note) => (
          <Link
            key={note.slug}
            href={`/notes/${note.slug}`}
            className={styles.noteLink}
          >
            <span
              className={styles.colorDot}
              style={{ backgroundColor: colorMap[note.color] }}
            />
            <div className={styles.noteContent}>
              <h2 className={styles.noteTitle}>{note.title}</h2>
              <div className={styles.noteMeta}>
                <span>{note.date}</span>
                <span>{note.readTime} min read</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
