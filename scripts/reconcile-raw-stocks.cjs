const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.collection('erpstates');
  const existing = await coll.findOne({ id: 'singleton' });
  if (!existing || !existing.data) {
    console.error('No singleton document found!');
    process.exit(1);
  }

  const data = JSON.parse(JSON.stringify(existing.data));
  const currentRev = (existing.revision || data._rev || 2214) + 1;

  console.log('Current rev:', existing.revision, '-> Next rev:', currentRev);

  // 1. Update Raw Materials stocks
  if (Array.isArray(data.products)) {
    data.products = data.products.map(p => {
      // Chicken
      if (p.id === 'prod-1793774658934-632' || (p.isRawMaterial && p.name && p.name.toLowerCase() === 'chicken')) {
        console.log('Setting Chicken stock to 0.49 kg');
        return {
          ...p,
          stockFactory: 0.49,
          stockOffice: 0,
          stock: 0.49,
        };
      }
      // Fish
      if (p.id === 'prod-1793774692217-596' || (p.isRawMaterial && p.name && p.name.toLowerCase() === 'fish')) {
        console.log('Setting Fish stock to 0 kg');
        return {
          ...p,
          stockFactory: 0,
          stockOffice: 0,
          stock: 0,
        };
      }
      // Beef
      if (p.id === 'prod-1793774619671-645' || (p.isRawMaterial && p.name && p.name.toLowerCase() === 'beef')) {
        console.log('Setting Beef stock to 0 kg');
        return {
          ...p,
          stockFactory: 0,
          stockOffice: 0,
          stock: 0,
        };
      }
      // Beef Kabab finished good
      if (p.id === 'prod-1793774844706-291' || (!p.isRawMaterial && p.name && p.name.toLowerCase() === 'beef kabab')) {
        console.log('Setting Beef Kabab costPrice to 190');
        return {
          ...p,
          costPrice: 190,
          stockFactory: 5,
          stockOffice: 0,
          stock: 5,
        };
      }
      // Fish Kabab finished good
      if (p.id === 'prod-1793774818728-219' || (!p.isRawMaterial && p.name && p.name.toLowerCase() === 'fish kabab')) {
        console.log('Setting Fish Kabab costPrice to 50');
        return {
          ...p,
          costPrice: 50,
          stockFactory: 5,
          stockOffice: 0,
          stock: 5,
        };
      }
      // Chicken Tikka finished good
      if (p.id === 'prod-1793774774640-256' || (!p.isRawMaterial && p.name && p.name.toLowerCase() === 'chicken tikka')) {
        console.log('Setting Chicken Tikka costPrice to 28.9');
        return {
          ...p,
          costPrice: 28.9,
          stockFactory: 3,
          stockOffice: 0,
          stock: 3,
        };
      }
      return p;
    });
  }

  // 2. Fix Beef Kabab BOM component to link to Beef instead of Fish
  if (Array.isArray(data.bomList)) {
    data.bomList = data.bomList.map(b => {
      if (b.finishedProductId === 'prod-1793774844706-291' || (b.finishedProductName && b.finishedProductName.toLowerCase().includes('beef kabab'))) {
        console.log('Updating Beef Kabab BOM component to Beef (BEE-166)');
        return {
          ...b,
          components: [
            {
              rawMaterialId: 'prod-1793774619671-645',
              rawMaterialCode: 'BEE-166',
              rawMaterialName: 'Beef',
              quantity: 0.2,
              unit: 'kg',
              unitCost: 950,
              totalCost: 190,
            }
          ],
          totalCost: 190,
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });
  }

  data._rev = currentRev;

  // Persist directly to MongoDB
  await coll.updateOne(
    { id: 'singleton' },
    {
      $set: {
        data,
        revision: currentRev,
        updatedAt: new Date(),
      }
    }
  );
  console.log('MongoDB erpstates updated successfully!');

  // Now trigger SSE via POST /api/state to the local running server (port 5000)
  const postPayload = JSON.stringify({
    data,
    clientRev: currentRev - 1,
    force: true,
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/state',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postPayload),
      'x-api-key': process.env.ERP_API_KEY || 'dotcolor-erp-secret-key-2026',
    },
  }, (res) => {
    let respData = '';
    res.on('data', chunk => respData += chunk);
    res.on('end', async () => {
      console.log('POST /api/state response status:', res.statusCode);
      console.log('POST /api/state body:', respData);
      await mongoose.disconnect();
      console.log('Completed successfully!');
      process.exit(0);
    });
  });

  req.on('error', async (err) => {
    console.warn('POST /api/state error (server may be busy, but DB was updated):', err.message);
    await mongoose.disconnect();
    process.exit(0);
  });

  req.write(postPayload);
  req.end();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
