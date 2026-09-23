const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://salman:4lanHyMRdCrtXDJ7@sign365.nglnioh.mongodb.net/test?retryWrites=true&w=majority';

async function checkOther() {
  await mongoose.connect(MONGODB_URI);
  for (const name of ['testdb', 'test-lab', 'tabahi', 'dandenong_review_1789709250241']) {
    const db = mongoose.connection.client.db(name);
    const cols = await db.listCollections().toArray();
    console.log(`Collections in "${name}":`);
    for (const c of cols) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`  - ${c.name}: ${count} docs`);
    }
  }
  await mongoose.disconnect();
}

checkOther().catch(console.error);
