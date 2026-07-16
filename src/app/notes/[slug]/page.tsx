import Link from 'next/link';
import { notes } from '@/data/notes';
import styles from './page.module.css';

import type { Metadata } from 'next';

/** 颜色映射：将 NoteItem.color 转换为 CSS 变量 */
const colorMap: Record<string, string> = {
  blue: 'var(--blue)',
  red: 'var(--red)',
  yellow: 'var(--yellow)',
  green: 'var(--green)',
};

/**
 * Next.js 16 静态路由生成
 * 从 notes 数据中提取所有 slug，构建时预渲染每篇文章
 */
export function generateStaticParams(): { slug: string }[] {
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = notes.find((n) => n.slug === slug);

  return {
    title: note ? `${note.title} — SPARK LAB` : 'Note Not Found',
    description: note ? `${note.title} · ${note.readTime} min read` : '',
  };
}

/**
 * 单篇文章详情页
 * Next.js 16: params 是 Promise，必须 await
 */
export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = notes.find((n) => n.slug === slug);

  if (!note) {
    return (
      <div className={styles.container}>
        <Link href="/notes" className={styles.backLink}>
          ← Back to notes
        </Link>
        <div className={styles.notFound}>
          <h1 className={styles.notFoundTitle}>Note not found</h1>
          <p className={styles.notFoundText}>
            The note &quot;{slug}&quot; does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/notes" className={styles.backLink}>
        ← Back to notes
      </Link>

      <div className={styles.meta}>
        <span
          className={styles.colorDot}
          style={{ backgroundColor: colorMap[note.color] }}
        />
        <span>{note.date}</span>
        <span>{note.readTime} min read</span>
      </div>

      <h1 className={styles.title}>{note.title}</h1>

      <div className={styles.divider} />

      <div className={styles.placeholder}>
        <p>
          This is a placeholder for the full article content. In a production
          setup, this would render MDX or markdown content fetched from a CMS or
          local files.
        </p>
      </div>
    </div>
  );
}
