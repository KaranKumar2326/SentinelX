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

async function inject() {
  console.log(`\n🚀 Injecting demo failure data into: ${BASE}\n`);

  // PHASE 1: Create the service/db/schema/table chain
  // (skip if already exists — 409 is OK)
  
  console.log('Step 1: Creating Database Service...');
  try {
    await api.put('/services/databaseServices', {
      name: 'SentinelX_Demo_DB',
      serviceType: 'Mysql',
      connection: { config: { type: 'Mysql', hostPort: 'localhost:3306', username: 'admin' } }
    });
    console.log('✅ Service created');
  } catch (e: any) {
    console.log(e.response?.status === 409 ? 'ℹ️  Service exists' : `⚠️  Service: ${e.response?.data?.message?.slice(0,100)}`);
  }

  console.log('Step 2: Creating Database...');
  try {
    await api.put('/databases', { name: 'ecommerce', service: 'SentinelX_Demo_DB' });
    console.log('✅ Database created');
  } catch (e: any) {
    console.log(e.response?.status === 409 ? 'ℹ️  Database exists' : `⚠️  DB: ${e.response?.data?.message?.slice(0,100)}`);
  }

  console.log('Step 3: Creating Schema...');
  try {
    await api.put('/databaseSchemas', { name: 'raw', database: 'SentinelX_Demo_DB.ecommerce' });
    console.log('✅ Schema created');
  } catch (e: any) {
    console.log(e.response?.status === 409 ? 'ℹ️  Schema exists' : `⚠️  Schema: ${e.response?.data?.message?.slice(0,100)}`);
  }

  console.log('Step 4: Creating Table...');
  try {
    await api.put('/tables', {
      name: 'user_orders',
      databaseSchema: 'SentinelX_Demo_DB.ecommerce.raw',
      tableType: 'Regular',
      columns: [
        { name: 'order_id',   dataType: 'INT',       dataTypeDisplay: 'int' },
        { name: 'user_id',    dataType: 'INT',       dataTypeDisplay: 'int' },
        { name: 'amount',     dataType: 'NUMERIC',   dataTypeDisplay: 'numeric' },
        { name: 'created_at', dataType: 'TIMESTAMP', dataTypeDisplay: 'timestamp' }
      ]
    });
    console.log('✅ Table created');
  } catch (e: any) {
    console.log(e.response?.status === 409 ? 'ℹ️  Table exists' : `⚠️  Table: ${e.response?.data?.message?.slice(0,100)}`);
  }

  // PHASE 2: Create test case and get its REAL FQN from OM
  const tableFQN = 'SentinelX_Demo_DB.ecommerce.raw.user_orders';
  console.log('\nStep 5: Creating Test Case...');
  let testFQN = '';
  try {
    const tc = await api.put('/dataQuality/testCases', {
      name: 'row_count_too_low',
      displayName: 'Row Count Must Be Healthy',
      entityLink: `<#E::table::${tableFQN}>`,
      testDefinition: 'tableRowCountToBeBetween',
      parameterValues: [
        { name: 'minValue', value: '500' },
        { name: 'maxValue', value: '100000' }
      ]
    });
    testFQN = tc.data.fullyQualifiedName;
    console.log(`✅ Test Case created FQN: ${testFQN}`);
  } catch (e: any) {
    if (e.response?.status === 409) {
      // Fetch actual FQN from OM
      try {
        const existing = await api.get(`/dataQuality/testCases/name/${encodeURIComponent(tableFQN + '.row_count_too_low')}`);
        testFQN = existing.data.fullyQualifiedName;
        console.log(`ℹ️  Test case exists. FQN: ${testFQN}`);
      } catch {
        testFQN = `${tableFQN}.row_count_too_low`;
        console.log(`ℹ️  Using guessed FQN: ${testFQN}`);
      }
    } else {
      console.error('❌ Test Case Error:', e.response?.data?.message?.slice(0, 200) || e.message);
      return;
    }
  }

  // PHASE 3: Push the FAILED state using correct URL encoding
  console.log('\nStep 6: 💥 Pushing FAILED incident result...');
  try {
    const encoded = testFQN.split('.').map(encodeURIComponent).join('.');
    await api.post(`/dataQuality/testCases/testCaseResult/${encoded}`, {
      timestamp: Math.floor(Date.now() / 1000),
      testCaseStatus: 'Failed',
      resultMessage: 'CRITICAL: Found 0 rows in user_orders. Upstream ingestion pipeline has stopped.',
      testResultValue: [{ name: 'rowCount', value: '0' }]
    });
    console.log('\n🎉 SUCCESS! The failure has been injected.');
    console.log(`   Table : ${tableFQN}`);
    console.log(`   Test  : ${testFQN}`);
    console.log(`   Status: ❌ FAILED (rowCount = 0)`);
    console.log('\n👉 Open your SentinelX Dashboard now and refresh! 🛡️\n');
  } catch (e: any) {
    console.error('❌ Failed to push test result:', e.response?.status, e.response?.data?.message?.slice(0, 200) || e.message);
    console.log('\n💡 Try this manually in OM UI:');
    console.log(`   1. Go to: http://10.142.146.106:8585`);
    console.log(`   2. Find table: ${tableFQN}`);
    console.log(`   3. Profiler & DQ tab → Run the test → It will auto-fail (0 rows < 500 min)`);
  }
}

inject();
