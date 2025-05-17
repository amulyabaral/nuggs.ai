import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';

// Get paths for all blog posts at build time
export async function getStaticPaths() {
  const blogDir = path.join(process.cwd(), 'blog');
  const files = fs.readdirSync(blogDir);
  
  const paths = files.map(filename => ({
    params: {
      slug: filename.replace(/\.md$/, ''),
    },
  }));
  
  return {
    paths,
    fallback: false,
  };
}

// Get content for a specific blog post
export async function getStaticProps({ params }) {
  const { slug } = params;
  const filePath = path.join(process.cwd(), 'blog', `${slug}`);
  
  // Read file content
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Parse frontmatter and content
  const { data, content } = matter(fileContent);
  
  // Get title from first heading if no frontmatter title
  const titleMatch = content.match(/^#+ (.*?)$/m);
  const title = data.title || (titleMatch ? titleMatch[1] : slug);
  
  return {
    props: {
      title,
      content,
      date: data.date || 'No date',
      ...data, // Include any other frontmatter data
    },
  };
}

export default function BlogPost({ title, content, date }) {
  const router = useRouter();
  
  return (
    <div className="pageContainer">
      <Head>
        <title>{title} | nuggs.ai</title>
        <meta name="description" content={`Read our article about ${title}`} />
      </Head>
      
      <header className="mainHeader">
        <div className="logoArea">
          <h1 className="logoText"><span className="logoEmoji">🥦 </span> nuggs.ai</h1>
        </div>
        <nav>
          <Link href="/" className="navLink">
            Home
          </Link>
          <Link href="/blog" className="navLink navLinkActive">
            Blog
          </Link>
        </nav>
      </header>
      
      <main className="blogPostContainer">
        <Link href="/blog" className="backToBlogs">← Back to all articles</Link>
        
        <article className="blogPostContent">
          <ReactMarkdown>
            {content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
} 