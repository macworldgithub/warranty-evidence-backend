const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://salman:4lanHyMRdCrtXDJ7@sign365.nglnioh.mongodb.net/booran_warranty?retryWrites=true&w=majority';

async function inspect() {
  await mongoose.connect(MONGODB_URI);
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log('Databases in cluster:');
  for (const dbInfo of dbs.databases) {
    const db = mongoose.connection.client.db(dbInfo.name);
    const cols = await db.listCollections().toArray();
    console.log(`- ${dbInfo.name}: ${cols.length} collections`);
  }
  await mongoose.disconnect();
}

inspect().catch(console.error);
