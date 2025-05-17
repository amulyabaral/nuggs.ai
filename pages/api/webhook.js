import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function updateUserSubscription(userId, subscriptionStatus, expiresAt = null) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: subscriptionStatus === 'active' ? 'premium' : 'free',
        subscription_expires_at: expiresAt
      })
      .eq('id', userId);
    
    if (error) throw error;
    console.log(`Updated subscription for user ${userId} to ${subscriptionStatus}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }
  
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata.userId || session.client_reference_id;
      
      // Retrieve the subscription to access its expiration date
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        // Update the user's subscription in the database
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        await updateUserSubscription(userId, subscription.status, expiresAt);
      }
      break;
    }
    
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object;
      const userId = subscription.metadata.userId;
      
      if (userId) {
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        await updateUserSubscription(userId, subscription.status, expiresAt);
      }
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId = subscription.metadata.userId;
      
      if (userId) {
        await updateUserSubscription(userId, 'canceled');
      }
      break;
    }
  }
  
  res.status(200).json({ received: true });
} 