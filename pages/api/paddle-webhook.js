import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Readable } from 'stream';

// Initialize Supabase client with the service role key for backend operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

// Helper function to buffer the request body
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to handle raw body for signature verification
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!PADDLE_WEBHOOK_SECRET) {
    console.error('Paddle Webhook Secret is not configured.');
    return res.status(500).json({ error: 'Server configuration error for webhooks.' });
  }

  const rawBody = await buffer(req);
  const bodyString = rawBody.toString();
  const paddleSignature = req.headers['paddle-signature'];

  if (!paddleSignature) {
    console.warn('Missing Paddle-Signature header');
    return res.status(400).json({ error: 'Missing Paddle-Signature header.' });
  }

  try {
    const [timestampPart, hashPart] = paddleSignature.split(';');
    const H1 = hashPart.split('=')[1];
    const T = timestampPart.split('=')[1];

    const signedPayload = T + ":" + bodyString;
    const expectedSignature = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    if (expectedSignature !== H1) {
      console.warn('Invalid Paddle webhook signature.');
      return res.status(400).json({ error: 'Invalid signature.' });
    }

    // Signature is valid, process the event
    const event = JSON.parse(bodyString);
    const eventType = event.event_type;
    const eventData = event.data;

    console.log(`Received Paddle webhook: ${eventType}`, eventData);

    // Handle different event types
    if (eventType === 'subscription.activated' || eventType === 'subscription.updated') {
      const userId = eventData.custom_data?.user_id;
      const subscriptionId = eventData.id;
      const status = eventData.status; // e.g., 'active', 'past_due', 'trialing'
      const currentBillingPeriod = eventData.current_billing_period;
      const nextBilledAt = eventData.next_billed_at; // When the next payment is due
      const endsAt = currentBillingPeriod?.ends_at; // When the current period (and thus subscription if not renewed) ends

      if (!userId) {
        console.error('User ID not found in custom_data for subscription event:', eventData);
        return res.status(400).json({ error: 'User ID missing in custom_data.' });
      }

      let subscriptionTier = 'free';
      let subscriptionExpiresAt = null;

      if (status === 'active' || status === 'trialing') {
        subscriptionTier = 'premium'; // Assuming all active subscriptions are premium
        subscriptionExpiresAt = endsAt || nextBilledAt; // Use ends_at if available, otherwise next_billed_at
      }


      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: subscriptionTier,
          subscription_expires_at: subscriptionExpiresAt,
          // You might want to store paddle_subscription_id and paddle_customer_id
          // paddle_subscription_id: subscriptionId,
          // paddle_customer_id: eventData.customer_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`Error updating profile for user ${userId} on ${eventType}:`, updateError);
        // Don't necessarily return 500, Paddle might retry. Log it.
      } else {
        console.log(`Profile updated for user ${userId} due to ${eventType}. New tier: ${subscriptionTier}`);
      }

    } else if (eventType === 'subscription.canceled') {
      const userId = eventData.custom_data?.user_id;
      // When a subscription is canceled, it might still be active until the end of the billing period.
      // Paddle sends `scheduled_change` object if cancellation is for end of period.
      // `status` will remain `active` until it truly expires.
      // The `ends_at` from `current_billing_period` or `next_billed_at` is still relevant.
      // If `eventData.status` becomes `canceled` immediately, then it's a hard cancel.

      if (!userId) {
        console.error('User ID not found in custom_data for subscription.canceled event:', eventData);
        return res.status(400).json({ error: 'User ID missing in custom_data.' });
      }
      
      // For a cancellation, the subscription typically remains active until the end of the current billing period.
      // So, we keep their tier as premium but ensure subscription_expires_at is set.
      // If the cancellation is immediate (status changes to 'canceled'), then tier becomes 'free'.
      let subscriptionTier = 'premium';
      let subscriptionExpiresAt = eventData.current_billing_period?.ends_at || eventData.next_billed_at;

      if (eventData.status === 'canceled') { // If Paddle marks it as 'canceled' immediately
        subscriptionTier = 'free';
        subscriptionExpiresAt = new Date().toISOString(); // Or null if you prefer
      }


      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: subscriptionTier, // Stays premium until expires_at
          subscription_expires_at: subscriptionExpiresAt, // This is the key field
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`Error updating profile for user ${userId} on subscription.canceled:`, updateError);
      } else {
        console.log(`Profile updated for user ${userId} due to subscription.canceled. Tier: ${subscriptionTier}, Expires: ${subscriptionExpiresAt}`);
      }
    }
    // Add more event handlers as needed (e.g., payment_succeeded, transaction.completed)

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error processing Paddle webhook:', error);
    res.status(500).json({ error: 'Internal Server Error while processing webhook.' });
  }
} 