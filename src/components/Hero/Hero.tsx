import Link from 'next/link';
import { about } from '@/data/about';
import { InkPixelLandscape } from './InkPixelLandscape';
import styles from './Hero.module.css';

function ArrowIcon() {
  return <span aria-hidden="true">⟶</span>;
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.4a9.8 9.8 0 0 0-3.1 19.1c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.3-2.3-.3-4.7-1.1-4.7-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.4 4.6-4.7 4.9.4.3.7 1 .7 1.9V21c0 .4.2.6.7.5A9.8 9.8 0 0 0 12 2.4Z"
      />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4" width="7" height="7" rx=".4" />
      <rect x="13.5" y="4" width="7" height="7" rx=".4" />
      <rect x="3.5" y="14" width="7" height="7" rx=".4" />
      <rect x="13.5" y="14" width="7" height="7" rx=".4" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4.5h14v15H5z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 5.5h17v13h-17z" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.artFrame}>
        <InkPixelLandscape className={styles.inkLandscape} />
      </div>

      <div className={styles.content}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowRule} aria-hidden="true" />
          <span className={styles.eyebrowPixels} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          HELLO THERE
        </div>

        <h1 className={styles.headline}>
          Hi, I&apos;m <span>Spark</span>.
        </h1>

        <div className={styles.roles} aria-label="Designer, developer, and builder">
          <span>Designer</span>
          <i aria-hidden="true" />
          <span>Developer</span>
          <i aria-hidden="true" />
          <span>Builder</span>
        </div>

        <p className={styles.bio}>
          I craft thoughtful digital experiences at the
          <br />
          intersection of design, code, and emerging AI.
          <br />
          Currently exploring systems, simplicity, and tools.
        </p>

        <div className={styles.actions}>
          <Link href="/work" className={styles.primaryAction}>
            View selected work
            <ArrowIcon />
          </Link>
          <Link href="/about" className={styles.secondaryAction}>
            About me
            <ArrowIcon />
          </Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.location}>
          <span className={styles.pin} aria-hidden="true">
            <i />
          </span>
          <span>
            Shanghai, China
            <small>UTC +08:00</small>
          </span>
        </div>

        <span className={styles.footerDivider} aria-hidden="true" />

        <div className={styles.socials}>
          <a
            href={about.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <GithubIcon />
          </a>
          <Link href="/work" aria-label="Selected work">
            <WorkIcon />
          </Link>
          <Link href="/notes" aria-label="Writing and notes">
            <NotesIcon />
          </Link>
          <Link href="/about" aria-label="Contact Spark">
            <MailIcon />
          </Link>
        </div>
      </footer>
    </section>
  );
}
