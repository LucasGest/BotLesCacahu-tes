const { getDb } = require('./firebase');

const COLLECTION = 'birthdays';

async function setBirthday(userId, day, month) {
  const db = getDb();
  if (!db) {
    console.warn('Firestore désactivé : anniversaire non enregistré.');
    return;
  }

  await db.collection(COLLECTION).doc(userId).set({ day, month }, { merge: true });
}

async function removeBirthday(userId) {
  const db = getDb();
  if (!db) {
    return;
  }

  await db.collection(COLLECTION).doc(userId).delete();
}

async function getAll() {
  const db = getDb();
  if (!db) {
    return {};
  }

  const snapshot = await db.collection(COLLECTION).get();
  const all = {};

  for (const doc of snapshot.docs) {
    all[doc.id] = doc.data();
  }

  return all;
}

async function markAnnounced(userId, year) {
  const db = getDb();
  if (!db) {
    return;
  }

  await db.collection(COLLECTION).doc(userId).set({ lastAnnouncedYear: year }, { merge: true });
}

module.exports = { setBirthday, removeBirthday, getAll, markAnnounced };
