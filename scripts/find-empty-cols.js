const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://salman:4lanHyMRdCrtXDJ7@sign365.nglnioh.mongodb.net/test?retryWrites=true&w=majority';

async function findEmptyCollections() {
  await mongoose.connect(MONGODB_URI);
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log('Searching for 0-doc empty collections across all databases...');
  const emptyCols = [];
  for (const dbInfo of dbs.databases) {
    if (['admin', 'local'].includes(dbInfo.name)) continue;
    const db = mongoose.connection.client.db(dbInfo.name);
    try {
      const cols = await db.listCollections().toArray();
      for (const c of cols) {
        const count = await db.collection(c.name).countDocuments();
        if (count === 0) {
          emptyCols.push({ db: dbInfo.name, collection: c.name });
          console.log(`EMPTY: ${dbInfo.name}.${c.name}`);
        }
      }
    } catch (err) {}
  }
  console.log(`Found ${emptyCols.length} empty collections.`);
  await mongoose.disconnect();
}

findEmptyCollections().catch(console.error);
