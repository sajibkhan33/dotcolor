import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const collInfo of collections) {
    const coll = mongoose.connection.db.collection(collInfo.name);
    const docs = await coll.find().toArray();
    console.log('Collection: ' + collInfo.name + ' (' + docs.length + ' docs)');
    docs.forEach((d, i) => {
      let data = d.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }
      console.log('  Doc ' + i + ': id=' + (d.id || d._id) + ', rev=' + d.revision + ', updatedAt=' + d.updatedAt + ', POs=' + data?.purchaseOrders?.length + ', Prods=' + data?.products?.length + ', Invoices=' + data?.invoices?.length);
    });
  }
  await mongoose.disconnect();
}

run().catch(console.error);
