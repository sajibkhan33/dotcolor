import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const erpStateColl = mongoose.connection.db.collection('erpstates');
  const doc = await erpStateColl.findOne();
  if (typeof doc.data === 'string') {
    console.log('doc.data is string, converting to object...');
    const obj = JSON.parse(doc.data);
    await erpStateColl.updateOne(
      { _id: doc._id },
      { $set: { data: obj, updatedAt: new Date() }, $inc: { revision: 1 } }
    );
    console.log('Successfully updated erpstates.data to object!');
  } else {
    console.log('doc.data is already an object of type:', typeof doc.data);
  }

  // Also check if there is an app_state or erp_states collection
  const appStateColl = mongoose.connection.db.collection('app_state');
  const appDoc = await appStateColl.findOne();
  if (appDoc && typeof appDoc.data === 'string') {
    console.log('app_state doc.data is string, converting...');
    const obj = JSON.parse(appDoc.data);
    await appStateColl.updateOne({ _id: appDoc._id }, { $set: { data: obj } });
  }

  const erpStatesColl = mongoose.connection.db.collection('erp_states');
  const erpStatesDoc = await erpStatesColl.findOne();
  if (erpStatesDoc && typeof erpStatesDoc.data === 'string') {
    console.log('erp_states doc.data is string, converting...');
    const obj = JSON.parse(erpStatesDoc.data);
    await erpStatesColl.updateOne({ _id: erpStatesDoc._id }, { $set: { data: obj } });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
