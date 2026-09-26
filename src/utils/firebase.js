const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const config = require('../config');

let db = null;

// FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY viennent du fichier JSON de
// compte de service généré dans Firebase (Paramètres du projet > Comptes de
// service > Générer une nouvelle clé privée). Optionnel : sans ces variables,
// tout ce qui dépend de Firestore reste désactivé plutôt que de faire planter
// le bot.
function initFirebase() {
  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    console.warn(
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY ne sont pas tous définis : Firestore est désactivé.'
    );
    return;
  }

  try {
    // Tolère plusieurs façons de coller la clé dans une variable d'env :
    // encodée en "\n" littéral sur une seule ligne, déjà en vraies nouvelles
    // lignes, ou entourée de guillemets accidentels.
    let privateKey = config.firebase.privateKey.trim();
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    const app = initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey
      })
    });

    db = getFirestore(app);
    console.log('Firestore activé.');
  } catch (error) {
    console.error("Impossible d'initialiser Firebase, Firestore reste désactivé :", error.message);
  }
}

function getDb() {
  return db;
}

module.exports = { initFirebase, getDb };
