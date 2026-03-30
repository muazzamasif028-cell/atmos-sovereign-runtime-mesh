/**
 * AXON OMNI LAB — WebSocket Manager
 * Real-time bidirectional communication layer
 *
 * Bridges the nervous-system event bus to browser clients,
 * enabling live dashboard updates, chat streaming, and
 * real-time workflow execution monitoring.
 */

import { WebSocketServer } from 'ws';

const NERVOUS_SYSTEM_WS = process.env.NERVOUS_SYSTEM_WS_URL || 'ws://localhost:3007';

/**
 * Attach WebSocket handling to an existing HTTP server
 * @param {import('http').Server} server
 * @returns {{ wss: WebSocketServer, broadcast: Function }}
 */
export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Client registry: Map<ws, { id, subscriptions, userId }>
  const clients = new Map();

  // ── Connection Handler ──────────────────────────────────────────────────────
  wss.on('connection', (ws, req) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    clients.set(ws, {
      id: clientId,
      subscriptions: new Set(['*']), // subscribe to all channels by default
      userId: null,
      connectedAt: new Date().toISOString(),
      ip,
    });

    console.log(`[WS] Client connected: ${clientId} from ${ip} (total: ${clients.size})`);

    // Welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to Axon Omni Lab real-time stream',
      timestamp: new Date().toISOString(),
    }));

    // ── Message Handler ───────────────────────────────────────────────────────
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const client = clients.get(ws);

        switch (msg.type) {
          case 'subscribe':
            // Subscribe to specific channels
            if (Array.isArray(msg.channels)) {
              client.subscriptions = new Set(msg.channels);
              ws.send(JSON.stringify({ type: 'subscribed', channels: [...client.subscriptions] }));
            }
            break;

          case 'unsubscribe':
            if (Array.isArray(msg.channels)) {
              msg.channels.forEach(ch => client.subscriptions.delete(ch));
              ws.send(JSON.stringify({ type: 'unsubscribed', channels: msg.channels }));
            }
            break;

          case 'identify':
            // Client identifies itself (e.g., with userId)
            client.userId = msg.userId;
            ws.send(JSON.stringify({ type: 'identified', userId: msg.userId }));
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          case 'publish':
            // Client publishes an event (forwarded to all subscribers)
            broadcast({
              channel: msg.channel || 'client.event',
              data: msg.data,
              source: clientId,
              timestamp: new Date().toISOString(),
            });
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: `Parse error: ${err.message}` }));
      }
    });

    // ── Disconnect Handler ────────────────────────────────────────────────────
    ws.on('close', (code, reason) => {
      const client = clients.get(ws);
      console.log(`[WS] Client disconnected: ${client?.id} (code: ${code})`);
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Client error:`, err.message);
      clients.delete(ws);
    });
  });

  // ── Broadcast Function ────────────────────────────────────────────────────
  function broadcast(event, targetChannel = null) {
    const payload = JSON.stringify(event);
    const channel = targetChannel || event.channel || '*';

    let sent = 0;
    for (const [ws, client] of clients.entries()) {
      if (ws.readyState !== 1) continue; // Not OPEN

      const shouldSend = client.subscriptions.has('*') ||
                         client.subscriptions.has(channel) ||
                         channel === '*';

      if (shouldSend) {
        try {
          ws.send(payload);
          sent++;
        } catch (err) {
          clients.delete(ws);
        }
      }
    }
    return sent;
  }

  // ── Send to specific user ─────────────────────────────────────────────────
  function sendToUser(userId, event) {
    const payload = JSON.stringify(event);
    let sent = 0;
    for (const [ws, client] of clients.entries()) {
      if (client.userId === userId && ws.readyState === 1) {
        try { ws.send(payload); sent++; } catch {}
      }
    }
    return sent;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  function getStats() {
    return {
      totalClients: clients.size,
      clients: [...clients.values()].map(c => ({
        id: c.id,
        userId: c.userId,
        subscriptions: [...c.subscriptions],
        connectedAt: c.connectedAt,
      })),
    };
  }

  // ── Connect to Nervous System event bus ──────────────────────────────────
  function connectToNervousSystem() {
    let nervousWs;
    try {
      const { WebSocket } = await import('ws');
      nervousWs = new WebSocket(NERVOUS_SYSTEM_WS);

      nervousWs.on('open', () => {
        console.log('[WS] Connected to nervous system event bus');
        nervousWs.send(JSON.stringify({ type: 'subscribe', channels: ['*'] }));
      });

      nervousWs.on('message', (raw) => {
        try {
          const event = JSON.parse(raw.toString());
          if (event.type !== 'connected') {
            broadcast(event);
          }
        } catch {}
      });

      nervousWs.on('close', () => {
        console.log('[WS] Nervous system connection lost, reconnecting in 5s...');
        setTimeout(connectToNervousSystem, 5000);
      });

      nervousWs.on('error', () => {
        // Will trigger close handler
      });
    } catch {
      // Nervous system not available — dashboard still works, just no live events
    }
  }

  // Attempt to connect to nervous system (non-blocking)
  setTimeout(() => {
    connectToNervousSystem().catch(() => {});
  }, 2000);

  return { wss, broadcast, sendToUser, getStats };
}

export default attachWebSocket;
