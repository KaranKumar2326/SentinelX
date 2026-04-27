import axios from 'axios';
import { prisma } from './prisma';

export interface WebhookPayload {
  incidentId: string;
  type: string;
  severity: string;
  entityName: string;
  description: string;
  status: string;
  timestamp: string;
  url: string;
}

export class WebhookService {
  private defaultWebhookUrl = process.env.WEBHOOK_URL || 'https://webhook.site/placeholder-id';

  async dispatch(payload: WebhookPayload) {
    if (!this.defaultWebhookUrl || this.defaultWebhookUrl.includes('placeholder')) {
      console.log(`[WEBHOOK SKIP] No valid URL configured. Would have sent: ${payload.entityName} failure.`);
      return;
    }

    try {
      console.log(`[WEBHOOK DISPATCH] Sending alert for ${payload.incidentId} to ${this.defaultWebhookUrl}...`);
      
      // Slack-compatible payload formatting
      const slackPayload = {
        text: `🚨 *SentinelX Data Alert: ${payload.type}*\n` +
              `> *Entity:* ${payload.entityName}\n` +
              `> *Severity:* \`${payload.severity}\`\n` +
              `> *Status:* _${payload.status}_\n` +
              `> *Details:* ${payload.description}\n` +
              `🔗 <${payload.url}|View RCA in Dashboard>`
      };

      await axios.post(this.defaultWebhookUrl, slackPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      // Log dispatch to database for UI
      await prisma.notificationLog.create({
        data: {
          channel: 'Slack',
          recipient: this.defaultWebhookUrl.split('/').pop() || 'Slack Channel',
          status: 'Delivered',
          incidentId: payload.incidentId,
          type: payload.type
        }
      });
      console.log(`[WEBHOOK SUCCESS] Alert delivered for ${payload.incidentId}.`);
    } catch (error: any) {
      console.error(`[WEBHOOK ERROR] Failed to dispatch alert: ${error.message}`);
      await prisma.notificationLog.create({
        data: {
          channel: 'Slack',
          recipient: 'Slack Channel',
          status: 'Failed',
          incidentId: payload.incidentId,
          type: payload.type
        }
      });
    }
  }
}

export const webhookService = new WebhookService();
