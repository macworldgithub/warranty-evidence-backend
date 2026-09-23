const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://salman:4lanHyMRdCrtXDJ7@sign365.nglnioh.mongodb.net/test?retryWrites=true&w=majority';

async function checkTest() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.client.db('test');
  const cols = await db.listCollections().toArray();
  console.log('Collections in "test":');
  for (const c of cols) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} docs`);
  }
  await mongoose.disconnect();
}

checkTest().catch(console.error);
