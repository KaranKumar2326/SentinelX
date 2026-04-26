const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE = (process.env.OPEN_METADATA_URL || '').replace(/\/$/, '');
const TOKEN = process.env.OPEN_METADATA_TOKEN;

axios.get(`${BASE}/lineage/table/name/SentinelX_Demo_DB.ecommerce.raw.user_orders?upstreamDepth=1&downstreamDepth=3`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
}).then(res => {
  console.dir(res.data.downstreamEdges, { depth: null });
});
