import '../styles/globals.css';
import Head from 'next/head';
import Script from 'next/script';
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
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6736452598930373"
     crossOrigin="anonymous"></script>
          </Head>
          <Script
            strategy="afterInteractive"
            src="https://www.googletagmanager.com/gtag/js?id=G-NWRYJEY849"
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-NWRYJEY849');
              `,
            }}
          />
          <Script
            id="firebase-init"
            strategy="afterInteractive"
            src="https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js"
          />
          <Script
            id="firebase-analytics"
            strategy="afterInteractive"
            src="https://www.gstatic.com/firebasejs/11.7.3/firebase-analytics.js"
          />
          <Script
            id="firebase-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                // Firebase configuration
                const firebaseConfig = {
                  apiKey: "AIzaSyB11MaGF8rcAO00GRnniaB5bMDieIvQTFU",
                  authDomain: "nuggs-ai.firebaseapp.com",
                  projectId: "nuggs-ai",
                  storageBucket: "nuggs-ai.firebasestorage.app",
                  messagingSenderId: "1043197921764",
                  appId: "1:1043197921764:web:f7678089eef0b0f7f31ff1",
                  measurementId: "G-J3XE0M7E1T"
                };

                // Initialize Firebase
                // Wait for the SDK to be available
                window.addEventListener('load', function() {
                  if (typeof firebase !== 'undefined') {
                    const app = firebase.initializeApp(firebaseConfig);
                    const analytics = firebase.getAnalytics(app);
                  }
                });
              `,
            }}
          />
          <Component {...pageProps} />
          <Footer />
        </>
      </AuthProvider>
    </SessionContextProvider>
  );
}

export default MyApp; 