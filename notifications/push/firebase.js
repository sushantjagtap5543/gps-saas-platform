const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendPush(token, title, body) {
    await admin.messaging().send({
        token,
        notification: { title, body }
    });
}

module.exports = { sendPush };