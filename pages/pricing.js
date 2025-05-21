import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';

export default function Pricing() {
  const { user, isPremium, loading, signOut, refreshUserProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();
  
  // Check for success or canceled payment from Paddle
  useEffect(() => {
    const { paddle_success, paddle_canceled, user_id } = router.query;
    
    if (paddle_success === 'true' && user_id) {
      // Payment was successful
      alert('Thank you for subscribing to Nuggs Premium!');
      // Optionally, refresh user profile to get new subscription status
      if (user && user.id === user_id) {
        refreshUserProfile();
      }
      // Clean up the URL
      router.replace('/pricing', undefined, { shallow: true });
    }
    
    if (paddle_canceled === 'true') {
      alert('Your subscription process was canceled. You can try again whenever you\'re ready.');
      // Clean up the URL
      router.replace('/pricing', undefined, { shallow: true });
    }
  }, [router, user, refreshUserProfile]);
  
  const handleSubscribe = async () => {
    if (loading) return; // Don't proceed if auth is loading

    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    
    try {
      setCheckoutLoading(true);
      
      // Call your API endpoint to create a Paddle checkout session
      const response = await fetch('/api/create-paddle-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
          // priceId: process.env.NEXT_PUBLIC_PADDLE_PREMIUM_PRICE_ID, // The price ID is now handled server-side
        }),
      });
      
      const responseData = await response.json();

      if (!response.ok || !responseData.url) {
        console.error("Paddle checkout creation failed:", responseData);
        alert(responseData.error || 'There was a problem initiating checkout. Please try again.');
        setCheckoutLoading(false);
        return;
      }
      
      // Redirect to Paddle Checkout
      window.location.href = responseData.url; // Use window.location.href for external redirects
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('There was a problem initiating checkout. Please try again.');
      setCheckoutLoading(false);
    }
    // No finally here, as redirect will happen or error will be caught.
    // If redirect doesn't happen due to an error before it, setCheckoutLoading(false) is handled.
  };
  
  return (
    <div className="pageContainer">
      <Head>
        <title>Premium Subscription | nuggs.ai</title>
        <meta name="description" content="Upgrade to Nuggs Premium for unlimited recipe generations" />
      </Head>
      
      <header className="mainHeader">
        <Link href="/" className="logoLink">
          <div className="logoArea">
            <h1 className="logoText">
              <img src="/logo.png" alt="Nuggs.ai logo" className="headerLogoImage" /> nuggs.ai
            </h1>
          </div>
        </Link>
        <nav>
          <Link href="/" className="navLink">
            Home
          </Link>
          <Link href="/blog" className="navLink">
            Blog
          </Link>
          {user ? (
            <Link href="/dashboard" className="navLink">
              Dashboard
            </Link>
          ) : (
            <button 
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="navLink authNavButton"
            >
              Log In
            </button>
          )}
        </nav>
      </header>
      
      <main className="pricingContainer">
        <h1 className="pricingTitle">Choose Your Nuggs Plan</h1>
        <p className="pricingSubtitle">Get access to AI-powered healthy recipe generation</p>
        
        <div className="pricingTiersContainer">
          <div className="pricingTierCard">
            <div className="tierHeader">
              <h2>Free</h2>
              <p className="tierPrice">$0</p>
              <p className="tierBilling">forever</p>
            </div>
            
            <div className="tierFeatures">
              <ul>
                <li>5 recipe generations per day</li>
                <li>Basic recipe access</li>
              </ul>
            </div>
            
            <div className="tierCTA">
              {!user ? (
                <button 
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="tierButton secondaryButton"
                >
                  Sign Up Free
                </button>
              ) : !isPremium ? (
                <span className="currentPlanBadge">Current Plan</span>
              ) : (
                <button 
                  className="tierButton secondaryButton"
                  disabled
                >
                  Downgrade
                </button>
              )}
            </div>
          </div>
          
          <div className="pricingTierCard premiumTierCard">
            <div className="popularBadge">Most Popular</div>
            <div className="tierHeader">
              <h2>Premium</h2>
              <p className="tierPrice">$2</p>
              <p className="tierBilling">per month</p>
            </div>
            
            <div className="tierFeatures">
              <ul>
                <li>✨ <strong>Unlimited</strong> recipe generations</li>
                <li>✨ Save recipes to access them later</li>
              </ul>
            </div>
            
            <div className="tierCTA">
              {isPremium ? (
                <span className="currentPlanBadge">Current Plan</span>
              ) : (
                <button 
                  onClick={handleSubscribe}
                  className="tierButton primaryButton"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Processing...' : 'Upgrade to Premium'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="pricingFAQ">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faqItem">
            <h3>Can I cancel my subscription anytime?</h3>
            <p>Yes, you can cancel your Premium subscription at any time. Your premium benefits will remain active until the end of your current billing period.</p>
          </div>
          
          <div className="faqItem">
            <h3>How do recipe generations work?</h3>
            <p>Free users can generate up to 5 recipe ideas per day. Premium members enjoy unlimited recipe generations with no daily limit.</p>
          </div>
          
          <div className="faqItem">
            <h3>How do I save recipes?</h3>
            <p>After generating a recipe, click the "Save Recipe" button. Free users can save up to 10 recipes, while Premium users have unlimited recipe storage.</p>
          </div>
          
          <div className="faqItem">
            <h3>Is my payment information secure?</h3>
            <p>Absolutely. We use Stripe, a PCI-compliant payment processor, to handle all transactions. We never store your credit card information on our servers.</p>
          </div>
        </div>
      </main>
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        authMode={authMode}
        message={authMode === 'login' 
          ? "Log in to access your account"
          : "Create an account to get started with Nuggs.ai"}
      />
    </div>
  );
} 