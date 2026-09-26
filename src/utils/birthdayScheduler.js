const birthdays = require('./birthdays');

const ANNOUNCE_CHANNEL_ID = '1553346904945987695'; // #général
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // toutes les heures

async function checkBirthdays(client) {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const all = await birthdays.getAll();
  const todayMatches = Object.entries(all).filter(
    ([, data]) => data.day === day && data.month === month && data.lastAnnouncedYear !== year
  );

  if (todayMatches.length === 0) {
    return;
  }

  const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);

  if (!channel?.isTextBased()) {
    console.warn(`Salon d'annonce d'anniversaire ${ANNOUNCE_CHANNEL_ID} introuvable.`);
    return;
  }

  for (const [userId] of todayMatches) {
    await channel.send(`🎂🥜 Joyeux anniversaire <@${userId}> ! Toute l'équipe des Cacahuètes te souhaite une excellente journée ! 🎉`);
    await birthdays.markAnnounced(userId, year);
  }
}

function startBirthdayScheduler(client) {
  checkBirthdays(client).catch((error) => console.error('Erreur lors de la vérification des anniversaires :', error.message));
  setInterval(() => {
    checkBirthdays(client).catch((error) => console.error('Erreur lors de la vérification des anniversaires :', error.message));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startBirthdayScheduler };
