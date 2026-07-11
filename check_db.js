const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load .env from the same directory as this script
dotenv.config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.DB_URL);
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('Users found in DB:');
        users.forEach(u => console.log(`- ${u.email} (${u.name})`));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkUsers();
