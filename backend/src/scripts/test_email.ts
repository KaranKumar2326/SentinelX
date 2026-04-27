import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { alertService } from '../services/alertService';

async function testEmail() {
  console.log('Using SMTP Host:', process.env.SMTP_HOST);
  console.log('Sending test email to:', process.env.ALERT_RECIPIENT);

  const mockIncident = {
    id: 'test-incident-123',
    severity: 'CRITICAL',
    entityName: 'user_orders_demo',
    entityId: 'SentinelX_Demo_DB.ecommerce.raw.user_orders',
    type: 'DQ_FAILURE',
    description: 'Self-HEALING TEST: This is a real alert sent via SentinelX using Resend SMTP.'
  };

  try {
    await alertService.sendIncidentAlert(mockIncident);
    console.log('Test email dispatched successfully!');
  } catch (err) {
    console.error('Test email failed:', err);
  }
}

// Wait for service to initialize
setTimeout(testEmail, 2000);
