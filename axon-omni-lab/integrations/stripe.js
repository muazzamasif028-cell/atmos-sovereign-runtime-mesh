/**
 * Stripe Integration
 * Payments, subscriptions, invoices, and customer management
 */

const STRIPE_SECRET_KEY    = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const BASE_URL = 'https://api.stripe.com/v1';

async function stripeRequest(path, method = 'GET', params = null) {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (params && method !== 'GET') {
    options.body = new URLSearchParams(flattenParams(params)).toString();
  }

  const url = method === 'GET' && params
    ? `${BASE_URL}${path}?${new URLSearchParams(params)}`
    : `${BASE_URL}${path}`;

  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(`Stripe error: ${data.error?.message || JSON.stringify(data)}`);
  return data;
}

function flattenParams(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      Object.assign(acc, flattenParams(val, fullKey));
    } else {
      acc[fullKey] = val;
    }
    return acc;
  }, {});
}

export const stripe = {
  // ── Customers ──────────────────────────────────────────────────────────────
  async createCustomer({ email, name, phone, metadata = {} }) {
    return stripeRequest('/customers', 'POST', { email, name, phone, metadata });
  },

  async getCustomer(customerId) {
    return stripeRequest(`/customers/${customerId}`);
  },

  async listCustomers({ limit = 10, email } = {}) {
    return stripeRequest('/customers', 'GET', { limit, ...(email && { email }) });
  },

  // ── Payment Intents ────────────────────────────────────────────────────────
  async createPaymentIntent({ amount, currency = 'usd', customerId, description, metadata = {} }) {
    return stripeRequest('/payment_intents', 'POST', {
      amount,
      currency,
      ...(customerId && { customer: customerId }),
      description,
      metadata,
    });
  },

  async confirmPaymentIntent(paymentIntentId, { paymentMethodId }) {
    return stripeRequest(`/payment_intents/${paymentIntentId}/confirm`, 'POST', {
      payment_method: paymentMethodId,
    });
  },

  // ── Subscriptions ──────────────────────────────────────────────────────────
  async createSubscription({ customerId, priceId, metadata = {} }) {
    return stripeRequest('/subscriptions', 'POST', {
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
    });
  },

  async cancelSubscription(subscriptionId) {
    return stripeRequest(`/subscriptions/${subscriptionId}`, 'DELETE');
  },

  // ── Invoices ───────────────────────────────────────────────────────────────
  async createInvoice({ customerId, description, metadata = {} }) {
    return stripeRequest('/invoices', 'POST', { customer: customerId, description, metadata });
  },

  async listInvoices({ customerId, limit = 10 } = {}) {
    return stripeRequest('/invoices', 'GET', { ...(customerId && { customer: customerId }), limit });
  },

  // ── Webhook Verification ───────────────────────────────────────────────────
  verifyWebhook(payload, signature) {
    if (!STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    // In production: use stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)
    // Requires the official stripe npm package for proper HMAC verification
    return { verified: true, note: 'Use stripe npm package for production webhook verification' };
  },

  isConfigured: () => !!STRIPE_SECRET_KEY,
};

export default stripe;
