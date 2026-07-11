const mongoose = require('mongoose');
const { User } = require('./models/User');
mongoose.connect('mongodb://localhost:27017/d').then(async () => {
    await User.findByIdAndUpdate('69e51d2d5a4045eb9c6c6fa0', { $push: { savedCards: { cardName: 'Test', cardNumberLast4: '1234' } } });
    const u = await User.findById('69e51d2d5a4045eb9c6c6fa0');
    console.log(JSON.stringify(u.savedCards, null, 2));
    process.exit(0);
}).catch(console.error);
