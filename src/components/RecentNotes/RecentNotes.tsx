import Link from 'next/link';
import { notes } from '@/data/notes';
import styles from './RecentNotes.module.css';

/** 颜色映射：将 NoteItem.color 转为 CSS 变量值 */
const colorMap: Record<string, string> = {
  blue: 'var(--blue)',
  red: 'var(--red)',
  yellow: 'var(--yellow)',
  green: 'var(--green)',
};

/** 格式化日期为 "May 08, 2024" 形式 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function RecentNotes() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon} aria-hidden="true">⊞</span>
          <h2 className={styles.title}>Recent Notes</h2>
        </div>

        <Link href="/notes" className={styles.viewAll}>
          View all
          <span className={styles.viewAllArrow} aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={styles.list}>
        {notes.map((note) => (
          <article key={note.slug} className={styles.item}>
            <Link href={`/notes/${note.slug}`}>
              <h3 className={styles.itemTitle}>{note.title}</h3>
            </Link>
            <div className={styles.itemMeta}>
              <span
                className={styles.colorDot}
                style={{ backgroundColor: colorMap[note.color] }}
                aria-hidden="true"
              />
              <span>{formatDate(note.date)}</span>
              <span className={styles.metaSep}>·</span>
              <span>{note.readTime} min read</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
