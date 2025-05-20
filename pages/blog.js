import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';

// This function runs at build time on the server
export async function getStaticProps() {
  const blogDir = path.join(process.cwd(), 'blog');
  
  // Get all files from the blog directory
  const files = fs.readdirSync(blogDir);
  
  // Get the posts data
  const posts = files.map(filename => {
    // Read file content
    const filePath = path.join(blogDir, filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse frontmatter
    const { data, content } = matter(fileContent);
    
    // Extract first image from the markdown content, if any
    const imageMatch = content.match(/!\[(.*?)\]\((.*?)\)/);
    const imagePath = imageMatch ? imageMatch[2] : '/default-thumbnail.jpg';
    
    // Create an excerpt (first ~150 characters)
    const excerpt = content.substr(0, 150).replace(/[#*_\[\]`]/g, '') + '...';
    
    // Get title from first heading if no frontmatter title
    const titleMatch = content.match(/^#+ (.*?)$/m);
    const title = data.title || (titleMatch ? titleMatch[1] : filename);
    
    return {
      slug: filename.replace(/\.md$/, ''),
      title,
      excerpt,
      imagePath,
      date: data.date || 'No date',
    };
  });
  
  // Sort posts by date (newest first) if date is available
  const sortedPosts = posts.sort((a, b) => {
    if (a.date === 'No date' || b.date === 'No date') return 0;
    return new Date(b.date) - new Date(a.date);
  });
  
  return {
    props: {
      posts: sortedPosts,
    },
  };
}

export default function Blog({ posts }) {
  const { user, signOut } = useAuth();

  return (
    <div className="pageContainer">
      <Head>
        <title>Blog | nuggs.ai</title>
        <meta name="description" content="Explore articles about healthy eating, plant-based foods, and sustainable nutrition." />
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
          {user ? (
            <Link href="/dashboard" className="navLink">
              Dashboard
            </Link>
          ) : (
            <button
              onClick={() => {
                console.log('Login button clicked');
              }}
              className="navLink authNavButton"
            >
              Log In
            </button>
          )}
        </nav>
      </header>
      
      <main className="blogContainer">
        <h1 className="blogPageTitle">Our Blog</h1>
        <p className="blogPageSubtitle">Explore our articles about nutrition, healthy recipes, and sustainable eating</p>
        
        <div className="blogGrid">
          {posts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.slug} className="blogCard">
              <div className="blogCardImageWrapper">
                <div className="blogCardImage">
                  {post.imagePath.startsWith('http') ? (
                    <img src={post.imagePath} alt={post.title} />
                  ) : (
                    <div className="defaultThumbnail">🥦</div>
                  )}
                </div>
              </div>
              <div className="blogCardContent">
                <h2 className="blogCardTitle">{post.title}</h2>
                <p className="blogCardExcerpt">{post.excerpt}</p>
                <span className="blogCardReadMore">Read more →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
} 