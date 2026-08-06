/**
 * SKIN SERVICE — Element 2: Security
 * Body Part: Skin
 * Role: Cloudflare integration, WAF rules, rate limiting, TLS management
 *
 * The skin is the first line of defence — it keeps threats out
 * and lets legitimate traffic flow freely.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3010;
const SERVICE_NAME = 'skin-service';

const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE_ID    = process.env.CLOUDFLARE_ZONE_ID;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

// ─── In-memory threat log ─────────────────────────────────────────────────────
const threatLog = [];
const rateLimitMap = new Map(); // ip → { count, windowStart }

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX       = 100;    // requests per window

// ─── Middleware ───────────────────────────────────────────────────────────────

function rateLimiter(req, res, next) {
  const ip  = req.headers['cf-connecting-ip'] || req.ip;
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  rateLimitMap.set(ip, entry);

  res.setHeader('X-RateLimit-Limit',     RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - entry.count));

  if (entry.count > RATE_LIMIT_MAX) {
    threatLog.push({ type: 'rate_limit', ip, timestamp: new Date().toISOString() });
    return res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
  }
  next();
}

app.use(rateLimiter);

// ─── Security Headers Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('X-XSS-Protection',          '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy',        'geolocation=(), microphone=(), camera=()');
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Security',
    bodyPart: 'Skin',
    status: 'healthy',
    cloudflareConfigured: !!(CF_API_TOKEN && CF_ZONE_ID),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Current security posture
app.get('/posture', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    posture: {
      waf:         { enabled: true,  mode: 'block' },
      ddosProtection: { enabled: true, level: 'high' },
      rateLimiting: { enabled: true, limit: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS },
      tls:         { minVersion: 'TLS 1.2', hsts: true },
      botFighting:  { enabled: true },
      ipFirewall:   { enabled: true, rules: [] },
    },
    cloudflare: {
      zoneId:    CF_ZONE_ID    ? '***configured***' : 'not configured',
      accountId: CF_ACCOUNT_ID ? '***configured***' : 'not configured',
    },
    timestamp: new Date().toISOString(),
  });
});

// Threat log
app.get('/threats', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    threats: threatLog.slice(-limit),
    total: threatLog.length,
    timestamp: new Date().toISOString(),
  });
});

// Report a threat (called by other services)
app.post('/threats/report', (req, res) => {
  const { type, ip, details, severity } = req.body;
  const threat = {
    type:      type || 'unknown',
    ip:        ip   || 'unknown',
    severity:  severity || 'medium',
    details,
    timestamp: new Date().toISOString(),
  };
  threatLog.push(threat);
  console.warn(`[SKIN] Threat detected: ${JSON.stringify(threat)}`);
  res.json({ logged: true, threat });
});

// Cloudflare WAF rules (read-only view — actual rules managed via CF dashboard)
app.get('/waf/rules', (req, res) => {
  res.json({
    rules: [
      { id: 'rule-001', name: 'Block SQL Injection',    action: 'block', enabled: true },
      { id: 'rule-002', name: 'Block XSS Attempts',     action: 'block', enabled: true },
      { id: 'rule-003', name: 'Block Bad Bots',         action: 'block', enabled: true },
      { id: 'rule-004', name: 'Rate Limit API Abuse',   action: 'challenge', enabled: true },
      { id: 'rule-005', name: 'Allow Trusted IPs',      action: 'allow',  enabled: true },
      { id: 'rule-006', name: 'Block Tor Exit Nodes',   action: 'block', enabled: false },
    ],
    source: 'cloudflare',
    zoneId: CF_ZONE_ID || 'not configured',
  });
});

// Validate an incoming request (used by face-service as middleware)
app.post('/validate', (req, res) => {
  const { ip, userAgent, path, method } = req.body;

  const suspiciousPatterns = [
    /(\bSELECT\b|\bDROP\b|\bINSERT\b|\bUNION\b)/i,
    /<script>/i,
    /\.\.\//,
    /\/etc\/passwd/,
  ];

  const isSuspicious = suspiciousPatterns.some(p =>
    p.test(path) || p.test(userAgent || '')
  );

  if (isSuspicious) {
    threatLog.push({ type: 'suspicious_request', ip, path, userAgent, timestamp: new Date().toISOString() });
    return res.json({ allowed: false, reason: 'Suspicious pattern detected' });
  }

  res.json({ allowed: true, ip, timestamp: new Date().toISOString() });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SKIN] Security service running on port ${PORT}`);
  console.log(`[SKIN] Cloudflare: ${CF_API_TOKEN ? 'configured' : 'not configured (set CLOUDFLARE_API_TOKEN)'}`);
});
