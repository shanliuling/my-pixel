import { Hero } from '@/components/Hero/Hero';
import { RecentNotes } from '@/components/RecentNotes/RecentNotes';
import styles from './page.module.css';

/**
 * 首页 — 一屏式互动主页
 *
 * 布局策略：
 * - flex column 撑满视口
 * - Hero 占据主要空间（flex: 1）
 * - RecentNotes 固定在底部
 * - 1440×900 下无纵向滚动
 */
export default function HomePage() {
  return (
    <main className={styles.page}>
      <Hero />
      <RecentNotes />
    </main>
  );
}
