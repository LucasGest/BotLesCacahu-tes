// Anti-spam : mute automatique si un même membre poste le même message
// plusieurs fois de suite en peu de temps. État en mémoire (pas besoin de
// survivre à un redémarrage, c'est une fenêtre glissante de quelques secondes).
const SPAM_WINDOW_MS = 10_000;
const SPAM_THRESHOLD = 4;
const SPAM_TIMEOUT_MS = 60_000;
const recentMessagesByUser = new Map();

// Retourne true si le message a été traité comme du spam (déjà supprimé, pas
// besoin d'aller plus loin dans le traitement du message par le reste du bot).
async function handleSpamCheck(message) {
  const now = Date.now();
  const history = (recentMessagesByUser.get(message.author.id) ?? []).filter(
    (entry) => now - entry.timestamp < SPAM_WINDOW_MS
  );
  history.push({ content: message.content, timestamp: now, message });

  const duplicates = history.filter(
    (entry) => entry.content.trim() !== '' && entry.content === message.content
  );

  if (duplicates.length < SPAM_THRESHOLD) {
    recentMessagesByUser.set(message.author.id, history);
    return false;
  }

  recentMessagesByUser.set(message.author.id, []);

  await Promise.all(duplicates.map((entry) => entry.message.delete().catch(() => {})));

  try {
    if (message.member?.moderatable) {
      await message.member.timeout(SPAM_TIMEOUT_MS, 'Spam de messages identiques');
      await message.channel.send(
        `🔇 ${message.author} a été mute ${SPAM_TIMEOUT_MS / 60_000} min pour spam de messages identiques.`
      );
    }
  } catch (error) {
    console.error(`Impossible de timeout ${message.author.tag} pour spam : ${error.message}`);
  }

  return true;
}

module.exports = { handleSpamCheck };
