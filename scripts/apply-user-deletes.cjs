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

  // Remove the customers marked by user: Sajib, Likhon Ahmed, Eng: Ali Jowel
  if (Array.isArray(data.customers)) {
    data.customers = data.customers.filter(c => {
      const name = (c.name || '').toLowerCase();
      return !(name.includes('sajib') || name.includes('likhon') || name.includes('ali jowel'));
    });
  }

  // Remove the units marked by user: Pieces, Feet, Rolls
  if (Array.isArray(data.productUnits)) {
    data.productUnits = data.productUnits.filter(u => {
      const code = (u.code || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      return !(code === 'pcs' || code === 'ft' || code === 'roll' || name === 'pieces' || name === 'feet' || name === 'rolls');
    });
  }

  data._rev = nextRev;

  await coll.updateOne(
    { id: 'singleton' },
    { $set: { data, revision: nextRev, updatedAt: new Date() } }
  );

  console.log('Updated MongoDB:');
  console.log('Remaining customers:', data.customers.map(c => c.name));
  console.log('Remaining units:', data.productUnits.map(u => u.name));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
