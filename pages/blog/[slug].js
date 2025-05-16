import Head from 'next/head';
import { getAllPostIds, getPostData } from '../../lib/posts';
import ReactMarkdown from 'react-markdown';
import styles from '../../styles/Home.module.css'; // Or a dedicated Blog.module.css
import Image from 'next/image'; // If you want to use Next/Image in posts

export async function getStaticPaths() {
  const paths = getAllPostIds();
  return {
    paths,
    fallback: false, // See the docs for fallback behavior
  };
}

export async function getStaticProps({ params }) {
  const postData = await getPostData(params.slug);
  return {
    props: {
      postData,
    },
  };
}

export default function BlogPost({ postData }) {
  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>{postData.title} - Nuggs.AI Blog</title>
        <meta name="description" content={postData.summary || postData.title} />
        <meta property="og:title" content={`${postData.title} - Nuggs.AI Blog`} />
        <meta property="og:description" content={postData.summary || 'Read this article on Nuggs.AI'} />
        <meta property="og:type" content="article" />
        <meta property="og:article:published_time" content={postData.date} />
        {/* Add author if you have it: <meta property="og:article:author" content={postData.authorName} /> */}
        <meta property="og:url" content={`https://nuggs.ai/blog/${postData.slug}`} />
        {postData.ogImage && <meta property="og:image" content={postData.ogImage.startsWith('http') ? postData.ogImage : `https://nuggs.ai${postData.ogImage}`} />}
        <link rel="canonical" href={`https://nuggs.ai/blog/${postData.slug}`} />

        {/* Article Structured Data */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "headline": "${postData.title}",
              "description": "${postData.summary || postData.title}",
              "datePublished": "${postData.date}",
              ${postData.dateModified ? `"dateModified": "${postData.dateModified}",` : ''}
              "author": {
                "@type": "Organization", 
                "name": "Nuggs.AI" 
              },
              "publisher": {
                "@type": "Organization",
                "name": "Nuggs.AI",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://nuggs.ai/healthy-icon.png" 
                }
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://nuggs.ai/blog/${postData.slug}"
              }
              ${postData.ogImage ? `,
              "image": {
                "@type": "ImageObject",
                "url": "${postData.ogImage.startsWith('http') ? postData.ogImage : `https://nuggs.ai${postData.ogImage}`}",
                "height": 630, 
                "width": 1200 
              }` : ''}
            }
          `}
        </script>
      </Head>

      {/* Simplified Header for blog posts */}
      <header className={styles.mainHeaderPill}>
         <div className={styles.logoArea}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span className={styles.logoText} style={{color: '#333'}}>Nuggs.AI</span>
          </a>
        </div>
        <nav className={styles.toolPillNavigation}>
            <a href="/" className={styles.toolPill} style={{ textDecoration: 'none' }}>
                🏠 Home
            </a>
            <a href="/blog" className={styles.toolPill} style={{ textDecoration: 'none' }}>
                📝 Blog
            </a>
        </nav>
      </header>

      <main className={styles.toolDisplaySection} style={{paddingTop: '2rem'}}>
        <article className={styles.toolContainer} style={{maxWidth: '900px'}}>
          <h1 className={styles.blogPostPageTitle}>{postData.title}</h1>
          <div className={styles.blogPostMeta}>
            Published on {new Date(postData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            {/* {postData.author && <span> by {postData.author}</span>} */}
          </div>
          {postData.ogImage && (
            <div className={styles.blogPostFeatureImage}>
              <Image 
                src={postData.ogImage.startsWith('http') ? postData.ogImage : postData.ogImage} 
                alt={postData.title} 
                width={800} 
                height={400} 
                style={{objectFit: 'cover', borderRadius: '8px', marginBottom: '1.5rem'}}
              />
            </div>
          )}
          <div className={styles.blogPostContent}>
            <ReactMarkdown>{postData.content}</ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
} 