const { getDb } = require('./firebase');

const COLLECTION = 'xp';

// Cooldown en mémoire : évite de gagner de l'XP en spammant, et évite une
// lecture Firestore à chaque message juste pour vérifier le cooldown.
const XP_COOLDOWN_MS = 60_000;
const XP_MIN = 15;
const XP_MAX = 25;
const lastXpAt = new Map();

// Courbe de progression volontairement simple : niveau = racine(xp / 50).
function levelForXp(xp) {
  return Math.floor(Math.sqrt(xp / 50));
}

function xpForLevel(level) {
  return 50 * level * level;
}

// Retourne null si l'XP n'a pas été accordée (Firebase non configuré, ou
// cooldown actif), sinon le nouvel état { xp, level, leveledUp }.
async function addXp(userId) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const now = Date.now();
  const last = lastXpAt.get(userId) ?? 0;

  if (now - last < XP_COOLDOWN_MS) {
    return null;
  }

  lastXpAt.set(userId, now);

  const gained = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
  const ref = db.collection(COLLECTION).doc(userId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const previousXp = doc.exists ? doc.data().xp : 0;
    const newXp = previousXp + gained;
    const previousLevel = levelForXp(previousXp);
    const newLevel = levelForXp(newXp);

    tx.set(ref, { xp: newXp }, { merge: true });

    return { xp: newXp, level: newLevel, leveledUp: newLevel > previousLevel };
  });
}

async function getRank(userId) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const doc = await db.collection(COLLECTION).doc(userId).get();
  const xp = doc.exists ? doc.data().xp : 0;
  return { xp, level: levelForXp(xp) };
}

async function getLeaderboard(limit = 10) {
  const db = getDb();
  if (!db) {
    return [];
  }

  const snapshot = await db.collection(COLLECTION).orderBy('xp', 'desc').limit(limit).get();
  return snapshot.docs.map((doc) => ({
    userId: doc.id,
    xp: doc.data().xp,
    level: levelForXp(doc.data().xp)
  }));
}

module.exports = { addXp, getRank, getLeaderboard, levelForXp, xpForLevel };
