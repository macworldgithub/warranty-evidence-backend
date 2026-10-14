const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
async function main() {
  const settings = { ...dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env'))), ...process.env };
  if (!settings.MONGODB_URI) throw new Error('Database configuration missing');
  try {
    await mongoose.connect(settings.MONGODB_URI, { serverSelectionTimeoutMS: 6000, autoIndex: false });
    const db = mongoose.connection.db;
    const sites = await db.collection('sites').find({ name: /South Morang Kia/i }, { projection: { _id: 0, id: 1, name: 1, isActive: 1 } }).toArray();
    const invitations = await db.collection('invitations').find({ email: 'abdulahadnaumanofficial@gmail.com' }, { projection: { _id: 0, status: 1, createdAt: 1 } }).toArray();
    const account = await db.collection('users').findOne({ email: 'abdulahadnaumanofficial@gmail.com' }, { projection: { _id: 0, role: 1, isActive: 1 } });
    let indexes;
    try { indexes = await db.collection('invitations').indexes(); }
    catch (error) { indexes = { errorCode: error.code, errorName: error.codeName }; }
    console.log(JSON.stringify({ connected: true, sites, invitations, accountExists: !!account, indexes }));
  } finally { await mongoose.disconnect(); }
}
main().catch(error => {
  console.error(JSON.stringify({ connected: false, errorName: error.name, errorCode: error.code || null, errorCodeName: error.codeName || null }));
  process.exitCode = 1;
});
