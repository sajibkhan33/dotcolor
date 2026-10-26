import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = "mongodb+srv://nurnavi929_db_user:PNQUE3GvuwdbY9G7@cluster0.fcs78rm.mongodb.net/dotcolor_erp?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const ErpState = mongoose.model('ErpState', new mongoose.Schema({}, { strict: false, collection: 'erpstates' }));
  const doc = await ErpState.findOne({ id: 'singleton' });
  console.log('Revision:', doc.get('revision'));
  console.log('UpdatedAt:', doc.get('updatedAt'));
  console.log('Invoices count:', doc.get('data.invoices')?.length);
  console.log('Transactions count:', doc.get('data.transactions')?.length);
  console.log('PurchaseOrders count:', doc.get('data.purchaseOrders')?.length);
  console.log('LastPurgedAt:', doc.get('data.lastPurgedAt'));
  console.log('Latest 5 audits:', JSON.stringify(doc.get('data.auditLogs')?.slice(0, 5), null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
