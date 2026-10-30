const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Message = require('../models/message.model');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for E2EE database healing");

    const users = await User.find({});
    const messages = await Message.find({ isEncrypted: true });

    console.log(`Analyzing ${users.length} users and ${messages.length} encrypted messages...`);

    // Map: userId -> Set of all known public keys
    const userPubKeys = new Map();
    const addKey = (userId, key) => {
      if (!userId || !key || typeof key !== "string" || !key.trim()) return;
      const uid = userId.toString();
      if (!userPubKeys.has(uid)) userPubKeys.set(uid, new Set());
      userPubKeys.get(uid).add(key.trim());
    };

    for (const u of users) {
      if (u.publicKey) addKey(u._id, u.publicKey);
      if (u.e2eeIdentity?.publicKey) addKey(u._id, u.e2eeIdentity.publicKey);
      if (u.activeSession?.publicKey) addKey(u._id, u.activeSession.publicKey);
      if (Array.isArray(u.deviceKeys)) {
        u.deviceKeys.forEach(dk => { if (dk?.publicKey) addKey(u._id, dk.publicKey); });
      }
    }

    for (const m of messages) {
      if (m.sender && m.encryption?.senderPublicKey) {
        addKey(m.sender, m.encryption.senderPublicKey);
      }
    }

    // 1. Sync all known public keys into user.deviceKeys so other clients can look them up
    let usersUpdated = 0;
    for (const u of users) {
      const uid = u._id.toString();
      const knownKeys = userPubKeys.get(uid);
      if (!knownKeys || knownKeys.size === 0) continue;

      if (!Array.isArray(u.deviceKeys)) {
        u.deviceKeys = [];
      }

      let modified = false;
      let counter = 1;
      for (const k of knownKeys) {
        const exists = u.deviceKeys.some(dk => dk?.publicKey === k);
        if (!exists) {
          u.deviceKeys.push({
            deviceId: `dev_migrated_${counter++}`,
            keyId: `key_migrated_${Date.now()}`,
            publicKey: k,
            createdAt: new Date(),
            lastSeenAt: new Date(),
          });
          modified = true;
        }
      }

      if (modified) {
        u.markModified("deviceKeys");
        await u.save();
        usersUpdated++;
      }
    }
    console.log(`Updated ${usersUpdated} users with their complete historical deviceKeys.`);

    // 2. Heal existing messages by populating recipientPublicKey if missing
    let messagesHealed = 0;
    for (const m of messages) {
      if (!m.encryption?.recipientPublicKey && m.recipient) {
        const recipientUser = users.find(u => u._id.toString() === m.recipient.toString());
        // Find most likely recipient key: recipient's current key or one of known keys
        const recipientKey = recipientUser?.e2eeIdentity?.publicKey || recipientUser?.publicKey || Array.from(userPubKeys.get(m.recipient.toString()) || [])[0];
        if (recipientKey) {
          if (!m.encryption) m.encryption = {};
          m.encryption.recipientPublicKey = recipientKey;
          m.markModified("encryption");
          await m.save();
          messagesHealed++;
        }
      }
    }
    console.log(`Healed ${messagesHealed} messages with recipientPublicKey.`);

    console.log("E2EE Healing Complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run();
