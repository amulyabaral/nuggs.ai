import Head from 'next/head';
import Link from 'next/link';
import { getSortedPostsData } from '../../lib/posts';
import styles from '../../styles/Home.module.css'; // You might want a dedicated Blog.module.css

export async function getStaticProps() {
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
    },
  };
}

export default function BlogIndex({ allPostsData }) {
  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Blog - Nuggs.AI</title>
        <meta name="description" content="Read the latest articles and insights on healthy eating, nutrition, and AI-powered food tools from Nuggs.AI." />
        <meta property="og:title" content="Blog - Nuggs.AI" />
        <meta property="og:description" content="Latest articles on healthy eating and AI food tools." />
        <meta property="og:url" content="https://nuggs.ai/blog" />
        <link rel="canonical" href="https://nuggs.ai/blog" />
      </Head>

      {/* You can reuse your main header or create a simpler one for blog pages */}
      <header className={styles.mainHeaderPill}>
        <div className={styles.logoArea}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            {/* Assuming your Image component is globally available or import it */}
            {/* <Image src="/healthy-icon.png" alt="Nuggs.AI Logo" width={40} height={40} /> */}
            <span className={styles.logoText} style={{color: '#333'}}>Nuggs.AI</span>
          </a>
        </div>
        <nav className={styles.toolPillNavigation}>
            <a href="/" className={styles.toolPill} style={{ textDecoration: 'none' }}>
                🏠 Home
            </a>
        </nav>
      </header>

      <main className={styles.toolDisplaySection} style={{paddingTop: '2rem'}}>
        <div className={styles.toolContainer} style={{maxWidth: '900px'}}>
          <h1 className={styles.blogTitle}>Nuggs.AI Blog</h1>
          <p className={styles.blogSubtitle}>
            Insights, tips, and updates on healthy eating, nutrition, and our AI tools.
          </p>
          <section className={styles.blogList}>
            {allPostsData.length === 0 && <p>No blog posts yet. Check back soon!</p>}
            {allPostsData.map(({ id, date, title, summary }) => (
              <article key={id} className={styles.blogPostEntry}>
                <h2>
                  <Link href={`/blog/${id}`} className={styles.blogPostTitleLink}>
                    {title}
                  </Link>
                </h2>
                <small className={styles.blogPostDate}>
                  {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </small>
                {summary && <p className={styles.blogPostSummary}>{summary}</p>}
                <Link href={`/blog/${id}`} className={styles.readMoreLink}>
                  Read more &rarr;
                </Link>
              </article>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
} 