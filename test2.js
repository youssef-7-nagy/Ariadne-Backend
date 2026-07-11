const mongoose = require('mongoose');
const { User } = require('./models/User');

mongoose.connect('mongodb://localhost:27017/d').then(async () => {
  const userId = '69e51d2d5a4045eb9c6c6fa0';
  const processedPaymentDetails = {
    cardName: 'youssef nagy kamal',
    cardNumberLast4: '6786',
    encryptedCardNumber: 'abc',
    expiryDate: '06/29'
  };

  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        savedCards: {
          ...processedPaymentDetails,
          cardType: 'stripe'
        }
      }
    });
    console.log("Successfully pushed!");
    const u = await User.findById(userId);
    console.log(JSON.stringify(u.savedCards, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}).catch(console.error);
