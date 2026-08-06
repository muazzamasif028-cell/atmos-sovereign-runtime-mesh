/**
 * Slack Integration
 * Messages, channels, users, and interactive components
 */

const SLACK_BOT_TOKEN    = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const BASE_URL = 'https://slack.com/api';

async function slackRequest(method, body = {}) {
  if (!SLACK_BOT_TOKEN) throw new Error('SLACK_BOT_TOKEN not configured');

  const response = await fetch(`${BASE_URL}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return data;
}

export const slack = {
  // ── Messages ───────────────────────────────────────────────────────────────
  async sendMessage({ channel, text, blocks, attachments, threadTs, username, iconEmoji }) {
    return slackRequest('chat.postMessage', {
      channel,
      text,
      blocks,
      attachments,
      thread_ts: threadTs,
      username,
      icon_emoji: iconEmoji,
    });
  },

  async updateMessage({ channel, ts, text, blocks }) {
    return slackRequest('chat.update', { channel, ts, text, blocks });
  },

  async deleteMessage({ channel, ts }) {
    return slackRequest('chat.delete', { channel, ts });
  },

  // ── Rich Notifications ─────────────────────────────────────────────────────
  async notify({ channel, title, message, color = 'good', fields = [], footer, imageUrl }) {
    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: title || 'Axon Notification' },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: message },
      },
    ];

    if (fields.length > 0) {
      blocks.push({
        type: 'section',
        fields: fields.map(f => ({ type: 'mrkdwn', text: `*${f.label}*\n${f.value}` })),
      });
    }

    if (footer) {
      blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: footer }] });
    }

    return slackRequest('chat.postMessage', { channel, text: message, blocks });
  },

  // ── Channels ───────────────────────────────────────────────────────────────
  async listChannels({ limit = 100, excludeArchived = true } = {}) {
    return slackRequest('conversations.list', { limit, exclude_archived: excludeArchived });
  },

  async getChannelInfo(channelId) {
    return slackRequest('conversations.info', { channel: channelId });
  },

  async joinChannel(channelId) {
    return slackRequest('conversations.join', { channel: channelId });
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  async listUsers({ limit = 100 } = {}) {
    return slackRequest('users.list', { limit });
  },

  async getUserInfo(userId) {
    return slackRequest('users.info', { user: userId });
  },

  async lookupUserByEmail(email) {
    return slackRequest('users.lookupByEmail', { email });
  },

  // ── Files ──────────────────────────────────────────────────────────────────
  async uploadFile({ channels, content, filename, title, filetype = 'text' }) {
    return slackRequest('files.upload', { channels, content, filename, title, filetype });
  },

  // ── Reactions ─────────────────────────────────────────────────────────────
  async addReaction({ channel, timestamp, name }) {
    return slackRequest('reactions.add', { channel, timestamp, name });
  },

  // ── Webhook Verification ───────────────────────────────────────────────────
  verifySignature(body, timestamp, signature) {
    if (!SLACK_SIGNING_SECRET) throw new Error('SLACK_SIGNING_SECRET not configured');
    // In production: use crypto.createHmac('sha256', SLACK_SIGNING_SECRET)
    //   .update(`v0:${timestamp}:${body}`).digest('hex')
    //   and compare with signature
    return { verified: true, note: 'Implement HMAC verification in production' };
  },

  isConfigured: () => !!SLACK_BOT_TOKEN,
};

export default slack;
