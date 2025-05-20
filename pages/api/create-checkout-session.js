import Stripe from 'stripe';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createPagesServerClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  try {
    const userId = user.id;
    const email = user.email;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID or Email missing from session' });
    }
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price: 'price_XXXXXXXXXXXX', // Replace with your actual Stripe price ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/pricing?success=true`,
      cancel_url: `${req.headers.origin}/pricing?canceled=true`,
      metadata: {
        userId,
      },
    });
    
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
} 