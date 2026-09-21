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

// Mute vocal 30s (pas un timeout complet, ça déconnecterait du vocal) pour
// qui mentionne quelqu'un d'autre que lui-même ou le bot.
async function handleMentionModeration(message, client) {
  const mentionsSomeoneElse = message.mentions.users.some(
    (user) => user.id !== message.author.id && user.id !== client.user.id
  );

  if (!mentionsSomeoneElse) {
    return;
  }

  await message.reply('Ferme ton miaw');

  try {
    // setMute ne fait rien si le membre n'est pas en vocal, pas besoin de
    // vérifier avant : on ne tente que s'il y est.
    if (message.member?.voice.channel) {
      await message.member.voice.setMute(true, 'A mentionné quelqu\'un d\'autre');

      setTimeout(() => {
        message.member.voice.setMute(false, 'Fin du mute automatique').catch((error) => {
          console.error(`Impossible de démute ${message.author.tag} : ${error.message}`);
        });
      }, 30_000);
    }
  } catch (error) {
    console.error(`Impossible de mute ${message.author.tag} : ${error.message}`);
  }
}

module.exports = { handleSpamCheck, handleMentionModeration };
