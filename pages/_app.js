import '../styles/globals.css';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import { useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import Footer from '../components/Footer';

function MyApp({ Component, pageProps }) {
  // Create a new supabase client for the browser (runs once)
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <AuthProvider>
        <>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta property="og:site_name" content="Nuggs.AI" />
            <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <Component {...pageProps} />
          <Footer />
        </>
      </AuthProvider>
    </SessionContextProvider>
  );
}

export default MyApp; 