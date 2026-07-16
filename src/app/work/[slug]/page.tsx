import Link from 'next/link';
import { works } from '@/data/works';
import styles from './page.module.css';

import type { Metadata } from 'next';

/**
 * Next.js 16 静态路由生成
 * 从 works 数据中提取所有 slug，构建时预渲染每个项目页
 */
export function generateStaticParams(): { slug: string }[] {
  return works.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);

  return {
    title: work ? `${work.title} — SPARK LAB` : 'Work Not Found',
    description: work?.description ?? '',
  };
}

/**
 * 单个项目详情页
 * Next.js 16: params 是 Promise，必须 await
 */
export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);

  if (!work) {
    return (
      <div className={styles.container}>
        <Link href="/work" className={styles.backLink}>
          ← Back to work
        </Link>
        <div className={styles.notFound}>
          <h1 className={styles.notFoundTitle}>Project not found</h1>
          <p className={styles.notFoundText}>
            The project &quot;{slug}&quot; does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/work" className={styles.backLink}>
        ← Back to work
      </Link>

      <div className={styles.meta}>
        <span>{work.year}</span>
      </div>

      <h1 className={styles.title}>{work.title}</h1>
      <p className={styles.description}>{work.description}</p>

      <div className={styles.tags}>
        {work.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.placeholder}>
        <p>
          This is a placeholder for the full project case study. In a production
          setup, this would include screenshots, architecture diagrams, and
          detailed write-ups.
        </p>
      </div>
    </div>
  );
}
