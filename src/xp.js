const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Cooldown en mémoire : évite de gagner de l'XP en spammant, et évite une
// lecture Firestore à chaque message juste pour vérifier le cooldown.
const XP_COOLDOWN_MS = 60_000;
const XP_MIN = 15;
const XP_MAX = 25;
const lastXpAt = new Map();

let db = null;

// FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL et FIREBASE_PROJECT_ID viennent
// du fichier JSON de clé de compte de service généré dans Firebase (Paramètres
// du projet > Comptes de service). Sans ça, le système d'XP reste désactivé
// plutôt que de faire planter le bot : Firebase est optionnel.
function initFirebase() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY ne sont pas tous définis : le système de niveaux/XP est désactivé."
    );
    return;
  }

  try {
    // Tolère plusieurs façons de coller la clé dans une variable d'env :
    // - encodée en "\n" littéral sur une seule ligne (format d'un .env)
    // - déjà en vraies nouvelles lignes (collée telle quelle dans un champ multi-ligne)
    // - entourée de guillemets accidentels
    let privateKey = FIREBASE_PRIVATE_KEY.trim();
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    const app = initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });

    db = getFirestore(app);
    console.log('Système de niveaux/XP activé (Firebase).');
  } catch (error) {
    console.error('Impossible d\'initialiser Firebase, le système de niveaux/XP est désactivé :', error.message);
  }
}

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
  const ref = db.collection('xp').doc(userId);

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
  if (!db) {
    return null;
  }

  const doc = await db.collection('xp').doc(userId).get();
  const xp = doc.exists ? doc.data().xp : 0;
  return { xp, level: levelForXp(xp) };
}

async function getLeaderboard(limit = 10) {
  if (!db) {
    return [];
  }

  const snapshot = await db.collection('xp').orderBy('xp', 'desc').limit(limit).get();
  return snapshot.docs.map((doc) => ({
    userId: doc.id,
    xp: doc.data().xp,
    level: levelForXp(doc.data().xp)
  }));
}

module.exports = { initFirebase, addXp, getRank, getLeaderboard, levelForXp, xpForLevel };
