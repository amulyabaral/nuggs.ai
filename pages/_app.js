import '../styles/globals.css';
import Head from 'next/head';
import Script from 'next/script';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:site_name" content="Nuggs.AI" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/broccoli-logo.svg" />
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
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 