import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE = (process.env.OPEN_METADATA_URL || '').replace(/\/$/, '');
const TOKEN = process.env.OPEN_METADATA_TOKEN;

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  timeout: 15000
});

async function run() {
  console.log(`\n🚀 Injecting Real Lineage into: ${BASE}\n`);
  try {
    const tableFQN = 'SentinelX_Demo_DB.ecommerce.raw.user_orders';
    console.log(`1. Fetching source table: ${tableFQN}`);
    let userOrders;
    try {
      const res = await api.get(`/tables/name/${encodeURIComponent(tableFQN)}`);
      userOrders = res.data;
    } catch(e) {
      console.error('❌ Source table `user_orders` not found! Please run the first demo script first.');
      return;
    }

    console.log('2. Creating Downstream Analytics Schema...');
    const analyticsSchemaFQN = 'SentinelX_Demo_DB.ecommerce.analytics';
    try {
      await api.put('/databaseSchemas', {
        name: 'analytics',
        database: 'SentinelX_Demo_DB.ecommerce'
      });
    } catch(e) { /* ignore 409 */ }

    console.log('3. Creating Downstream Tables (customer_metrics, core_dashboard)...');
    const metricsRes = await api.put('/tables', {
        name: 'customer_metrics',
        databaseSchema: analyticsSchemaFQN,
        tableType: 'Regular',
        columns: [
          { name: 'user_id', dataType: 'INT' },
          { name: 'total_spent', dataType: 'NUMERIC' }
        ]
    });
    const customerMetrics = metricsRes.data;

    const dashRes = await api.put('/tables', {
        name: 'core_dashboard',
        databaseSchema: analyticsSchemaFQN,
        tableType: 'Regular',
        columns: [
          { name: 'kpi_name', dataType: 'VARCHAR', dataLength: 100 },
          { name: 'value', dataType: 'NUMERIC' }
        ]
    });
    const coreDash = dashRes.data;

    console.log('4. Knitting Lineage Graph 🕸️...');
    // raw_user_orders -> customer_metrics
    await api.put('/lineage', {
      edge: {
        fromEntity: { id: userOrders.id, type: 'table' },
        toEntity: { id: customerMetrics.id, type: 'table' }
      }
    });
    
    // customer_metrics -> core_dashboard
    await api.put('/lineage', {
      edge: {
        fromEntity: { id: customerMetrics.id, type: 'table' },
        toEntity: { id: coreDash.id, type: 'table' }
      }
    });

    console.log('\n🎉 SUCCESS! Lineage generated.');
    console.log('   [user_orders] ──► [customer_metrics] ──► [core_dashboard]');
    console.log('\n👉 Open SentinelX Dashboard. The War Room will now show a cascading Blast Radius! 🛡️📊\n');

  } catch(e: any) {
    console.error('\n❌ Failed to inject lineage:', e.response?.data || e.message);
  }
}

run();
