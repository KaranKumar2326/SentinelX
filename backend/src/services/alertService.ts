import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { webhookService } from './webhookService';

class AlertService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user, pass },
        });
        console.log('--- PRODUCTION EMAIL SERVICE CONFIGURED ---');
      } else {
        // Fallback to Ethereal for Demo
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log('--- DEMO EMAIL SERVICE CONFIGURED (ETHEREAL) ---');
      }
    } catch (err) {
      console.error('Failed to configure alert service', err);
    }
  }

  async sendIncidentAlert(incident: any) {
    if (!this.transporter) return;

    // Fetch all registered users to notify them
    const users = await prisma.user.findMany({ select: { email: true } });
    const recipients = users.map(u => u.email);

    // Add fallback recipient from ENV if no users exist
    if (recipients.length === 0 && process.env.ALERT_RECIPIENT) {
      recipients.push(process.env.ALERT_RECIPIENT);
    }

    if (recipients.length === 0) {
      console.warn('[ALERT SKIPPED] No recipients found in database or .env');
      return;
    }

    const isCritical = incident.severity === 'CRITICAL';
    const previewUrl = `http://localhost:5175/incidents/${incident.id}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'SentinelX <onboarding@resend.dev>',
      to: recipients.join(', '),
      subject: `[${incident.severity}] ${incident.entityName}: ${incident.type} detected`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff;">
          <div style="background: ${isCritical ? '#9f1239' : '#4338ca'}; padding: 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">SentinelX Alert</h1>
          </div>
          <div style="padding: 24px;">
            <div style="margin-bottom: 24px;">
              <p style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 0 0 8px 0;">Dataset Incident Detected</p>
              <div style="display: inline-block; padding: 4px 12px; border-radius: 99px; background: ${isCritical ? '#fff1f2' : '#eef2ff'}; color: ${isCritical ? '#e11d48' : '#4f46e5'}; font-size: 12px; font-weight: bold;">
                ${incident.severity} SEVERITY
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #64748b; font-weight: bold; width: 120px;">ENTITY NAME</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1e293b; font-weight: bold;">${incident.entityName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #64748b; font-weight: bold;">FAILURE TYPE</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1e293b;">${incident.type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 12px; color: #64748b; font-weight: bold;">ENTITY ID</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1e293b; font-family: monospace;">${incident.entityId}</td>
              </tr>
            </table>

            <div style="padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;"><strong>Description:</strong> ${incident.description}</p>
            </div>

            <div style="text-align: center;">
              <a href="${previewUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: #white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Go to War Room</a>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            © 2024 SentinelX Autonomous Data Response Engine. Triggered from OpenMetadata.
          </div>
        </div>
      `
    };

    try {
      // Send individual emails to each recipient
      // This ensures that if one email is rejected (e.g. unverified in Resend trial), 
      // the others still get delivered.
      for (const email of recipients) {
        const individualMailOptions = { ...mailOptions, to: email };
        try {
          const info = await this.transporter.sendMail(individualMailOptions);
          const etherealUrl = nodemailer.getTestMessageUrl(info);
          console.log(`[ALERT SENT] Email sent to ${email} for incident ${incident.id}.`);
          
          // Log dispatch to database for UI
          await prisma.notificationLog.create({
            data: {
              channel: 'Email',
              recipient: email,
              status: 'Delivered',
              incidentId: incident.id,
              type: incident.type
            }
          });
        } catch (mailErr) {
          console.error(`[ALERT FAILED] Could not send email to ${email}:`, mailErr);
          await prisma.notificationLog.create({
            data: {
              channel: 'Email',
              recipient: email,
              status: 'Failed',
              incidentId: incident.id,
              type: incident.type
            }
          });
        }
      }

      // PHASE 2: Dispatch real-time JSON Webhook (Generic notification)
      await webhookService.dispatch({
        ...incident,
        incidentId: incident.id,
        timestamp: new Date().toISOString(),
        url: `http://localhost:5175/incidents/${incident.id}`
      });
      
    } catch (err) {
      console.error('Error in alert dispatch loop', err);
    }
  }
}

export const alertService = new AlertService();
