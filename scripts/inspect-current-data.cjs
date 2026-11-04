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

  const { products, boms, invoices, purchaseOrders } = existing.data;
  console.log('PRODUCTS:');
  console.log(products?.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    isRawMaterial: p.isRawMaterial,
    stockFactory: p.stockFactory,
    stockOffice: p.stockOffice,
    stock: p.stock,
    cost: p.cost,
    costPrice: p.costPrice
  })));

  console.log('BOMS:');
  console.log(JSON.stringify(boms, null, 2));

  console.log('INVOICES:');
  console.log(invoices?.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    items: inv.items?.map(it => ({ name: it.name, quantity: it.quantity }))
  })));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
