import Script from 'next/script';

const AdScript = () => {
  // It's important to check if we are in a browser environment
  // before attempting to load scripts that interact with the window object,
  // though next/script handles this well.
  // For AdSense, the script itself is designed to be robust.
  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6736452598930373"
      crossOrigin="anonymous"
      strategy="afterInteractive" // Loads after the page becomes interactive
    />
  );
};

export default AdScript; 