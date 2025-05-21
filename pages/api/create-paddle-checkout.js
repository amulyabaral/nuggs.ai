import { createClient } from '@supabase/supabase-js'; // ADDED

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_API_BASE_URL = 'https://api.paddle.com'; // Use sandbox URL for testing if needed: https://sandbox-api.paddle.com
const PREMIUM_PRICE_ID = process.env.PADDLE_PREMIUM_PRICE_ID; // Your specific price ID for the premium plan
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ADDED: Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!PADDLE_API_KEY || !PREMIUM_PRICE_ID) {
    console.error('Paddle API Key or Premium Price ID is not configured.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  // ADDED: Check for Supabase environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase URL or Service Role Key is not configured for the backend.');
    return res.status(500).json({ error: 'Server configuration error for database integration.' });
  }

  const { email, userId } = req.body;

  if (!email || !userId) {
    return res.status(400).json({ error: 'Email and User ID are required.' });
  }

  try {
    const transactionData = {
      items: [
        {
          price_id: PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      customer: {
        email: email,
        // You can add more customer details here if needed, e.g., address
      },
      custom_data: { // This data will be available in webhooks and the Paddle dashboard
        user_id: userId,
      },
      // Define where Paddle should redirect the user after checkout
      // It's often better to configure these in your Paddle dashboard under Checkout Settings
      // but you can override them here.
      checkout: {
        settings: {
          success_url: `${APP_URL}/pricing?paddle_success=true&user_id=${userId}`, // Or a dedicated success page
          cancel_url: `${APP_URL}/pricing?paddle_canceled=true`,
        }
      },
      collection_mode: 'automatic', // For subscriptions
    };

    const paddleResponse = await fetch(`${PADDLE_API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const paddleResponseData = await paddleResponse.json();

    if (!paddleResponse.ok || !paddleResponseData.data || !paddleResponseData.data.checkout || !paddleResponseData.data.checkout.url) {
      console.error('Paddle API Error:', paddleResponseData);
      const errorMessage = paddleResponseData.error?.detail || paddleResponseData.error?.type || 'Failed to create Paddle checkout session.';
      return res.status(paddleResponse.status || 500).json({ error: `Paddle Error: ${errorMessage}` });
    }

    // The checkout URL to redirect the user to
    const checkoutUrl = paddleResponseData.data.checkout.url;
    res.status(200).json({ url: checkoutUrl });

  } catch (error) {
    console.error('Error creating Paddle checkout session:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
} 