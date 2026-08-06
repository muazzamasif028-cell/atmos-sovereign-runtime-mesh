/**
 * Gmail Integration
 * Send emails, read inbox, manage labels via Gmail API
 */

const GMAIL_CLIENT_ID     = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail OAuth credentials not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedAccessToken;
}

async function gmailRequest(path, method = 'GET', body = null) {
  const token = await getAccessToken();
  const response = await fetch(`${GMAIL_API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Gmail API error: ${JSON.stringify(data)}`);
  return data;
}

function encodeEmail({ to, from, subject, body, html, cc, bcc }) {
  const headers = [
    `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    `From: ${from || 'me'}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (cc)  headers.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
  if (bcc) headers.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);

  let emailContent;
  if (html) {
    headers.push('Content-Type: text/html; charset=utf-8');
    emailContent = headers.join('\r\n') + '\r\n\r\n' + html;
  } else {
    headers.push('Content-Type: text/plain; charset=utf-8');
    emailContent = headers.join('\r\n') + '\r\n\r\n' + (body || '');
  }

  return Buffer.from(emailContent).toString('base64url');
}

export const gmail = {
  // ── Send Email ─────────────────────────────────────────────────────────────
  async sendEmail({ to, subject, body, html, cc, bcc, from }) {
    const raw = encodeEmail({ to, from, subject, body, html, cc, bcc });
    return gmailRequest('/users/me/messages/send', 'POST', { raw });
  },

  // ── List Messages ──────────────────────────────────────────────────────────
  async listMessages({ query = '', maxResults = 10, labelIds = [] } = {}) {
    const params = new URLSearchParams({ maxResults, ...(query && { q: query }) });
    if (labelIds.length) labelIds.forEach(l => params.append('labelIds', l));
    return gmailRequest(`/users/me/messages?${params}`);
  },

  // ── Get Message ────────────────────────────────────────────────────────────
  async getMessage(messageId, format = 'full') {
    return gmailRequest(`/users/me/messages/${messageId}?format=${format}`);
  },

  // ── List Labels ────────────────────────────────────────────────────────────
  async listLabels() {
    return gmailRequest('/users/me/labels');
  },

  // ── Create Draft ───────────────────────────────────────────────────────────
  async createDraft({ to, subject, body, html }) {
    const raw = encodeEmail({ to, subject, body, html });
    return gmailRequest('/users/me/drafts', 'POST', { message: { raw } });
  },

  // ── Get Profile ────────────────────────────────────────────────────────────
  async getProfile() {
    return gmailRequest('/users/me/profile');
  },

  isConfigured: () => !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN),
};

export default gmail;
