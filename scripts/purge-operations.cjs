const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.collection('erpstates');
  const existing = await coll.findOne({ id: 'singleton' });
  if (!existing || !existing.data) {
    console.log('No singleton data');
    process.exit(1);
  }

  const currentRev = existing.revision || existing.data._rev || 1;
  const nextRev = currentRev + 1;
  const data = { ...existing.data };

  // 1. POS Counter & Sales
  data.invoices = [];
  data.quotations = [];
  if (Array.isArray(data.customers)) {
    data.customers = data.customers.map(c => ({
      ...c,
      totalPurchased: 0,
      dueAmount: 0,
      advanceBalance: 0,
    }));
  }

  // 2. Supply & Purchase
  data.purchaseOrders = [];
  data.procurementRequisitions = [];
  if (Array.isArray(data.suppliers)) {
    data.suppliers = data.suppliers.map(s => ({
      ...s,
      totalPurchased: 0,
      balancePayable: 0,
      dueAmount: 0,
    }));
  }

  // 3. Inventory
  data.products = [];
  data.productCategories = [];
  data.bomList = [];
  data.stockMovements = [];

  // 4. Financial txs
  if (Array.isArray(data.transactions)) {
    data.transactions = data.transactions.filter(t => {
      const isSales = t.category === 'Sales Revenue' || t.category === 'Customer Payment' || t.category === 'Customer Advance Adjustment';
      const isInv = Boolean(t.refNo && (t.refNo.startsWith('DCC-INV-') || t.refNo.startsWith('inv-')));
      const isPo = Boolean(t.refNo && (t.refNo.startsWith('DCC-PO-') || t.refNo.startsWith('po-') || t.refNo.startsWith('PO-')));
      return !(isSales || isInv || isPo);
    });
  }

  if (Array.isArray(data.journalEntries)) {
    data.journalEntries = data.journalEntries.filter(je => {
      const isSalesOrPo = je.source === 'SALES' || je.source === 'PURCHASE';
      const isInvOrPo = Boolean(je.refNo && (je.refNo.startsWith('DCC-INV-') || je.refNo.startsWith('inv-') || je.refNo.startsWith('DCC-PO-') || je.refNo.startsWith('po-')));
      return !(isSalesOrPo || isInvOrPo);
    });
  }

  data.lastPurgedAt = new Date().toISOString();
  data.lastPurgeMode = 'RESET_OPERATIONS';
  data._rev = nextRev;

  await coll.updateOne(
    { id: 'singleton' },
    { $set: { data, revision: nextRev, updatedAt: new Date() } }
  );

  console.log('Successfully wiped operational data in MongoDB Atlas!');
  console.log('Products:', data.products.length);
  console.log('Categories:', data.productCategories.length);
  console.log('BOM:', data.bomList.length);
  console.log('PRs:', data.procurementRequisitions.length);
  console.log('POs:', data.purchaseOrders.length);
  console.log('Invoices:', data.invoices.length);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
