import { Hero } from '@/components/Hero/Hero';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <Hero />
    </main>
  );
}
