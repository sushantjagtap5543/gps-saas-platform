const admin = require("firebase-admin");

let initialised = false;

function init() {
  if (initialised) return;
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require("./serviceAccount.json");
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialised = true;
    console.log("[FIREBASE] Initialised");
  } catch (err) {
    console.warn("[FIREBASE] Not initialised — push notifications disabled:", err.message);
  }
}

async function sendPush(token, title, body) {
  if (!initialised) return;
  try {
    await admin.messaging().send({ token, notification: { title, body } });
  } catch (err) {
    console.error("[FIREBASE] Push failed:", err.message);
  }
}

module.exports = { init, sendPush };
