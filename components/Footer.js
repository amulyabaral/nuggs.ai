import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mainFooterComponent">
      <div className="footerContent">
        <p>&copy; {currentYear} nuggs.ai. All rights reserved.</p>
        <nav className="footerNav">
          <Link href="/terms-of-service" className="footerLink">
            Terms of Service
          </Link>
          <Link href="/privacy-policy" className="footerLink">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
} 