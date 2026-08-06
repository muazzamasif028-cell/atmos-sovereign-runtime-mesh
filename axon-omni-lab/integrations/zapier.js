/**
 * Zapier Integration
 * Trigger Zaps via webhooks and receive Zapier events
 */

const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

export const zapier = {
  /**
   * Trigger a Zap by sending data to a Zapier webhook
   * @param {object} data - The data to send to Zapier
   * @param {string} [webhookUrl] - Override the default webhook URL
   */
  async trigger(data, webhookUrl = null) {
    const url = webhookUrl || ZAPIER_WEBHOOK_URL;
    if (!url) throw new Error('ZAPIER_WEBHOOK_URL not configured');

    const payload = {
      ...data,
      _source: 'axon-omni-lab',
      _timestamp: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Zapier webhook error (${response.status}): ${text}`);
    }

    return { triggered: true, status: response.status, timestamp: payload._timestamp };
  },

  /**
   * Trigger a named event (useful for multi-step Zaps)
   */
  async triggerEvent(eventName, eventData = {}) {
    return zapier.trigger({ event: eventName, data: eventData });
  },

  /**
   * Send a notification via Zapier (e.g., to email, Slack, etc.)
   */
  async notify({ title, message, severity = 'info', metadata = {} }) {
    return zapier.trigger({
      type: 'notification',
      title,
      message,
      severity,
      metadata,
    });
  },

  /**
   * Trigger a workflow automation via Zapier
   */
  async triggerWorkflow({ workflowName, inputs = {} }) {
    return zapier.trigger({
      type: 'workflow',
      workflowName,
      inputs,
    });
  },

  isConfigured: () => !!ZAPIER_WEBHOOK_URL,
};

export default zapier;
