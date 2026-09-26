const config = require('../config');

let client = null;

// Appelé une fois au démarrage (index.js), pour que logError puisse ensuite
// envoyer dans le salon de logs sans avoir à passer le client partout.
function initLogger(discordClient) {
  client = discordClient;
}

// Ne remonte JAMAIS l'erreur technique à un utilisateur Discord (le message
// d'erreur peut contenir des détails internes) : elle va seulement en console
// et, si configuré, dans un salon de logs privé.
async function logError(context, error) {
  console.error(`[${context}]`, error);

  if (!client || !config.logChannelId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(config.logChannelId);

    if (channel?.isTextBased()) {
      const message = error instanceof Error ? error.message : String(error);
      await channel.send(`⚠️ **${context}**\n\`\`\`${message.slice(0, 1800)}\`\`\``);
    }
  } catch (loggingError) {
    // Si même le logging échoue, on se contente de la console pour ne pas boucler.
    console.error('[logger] Impossible d\'envoyer dans le salon de logs :', loggingError.message);
  }
}

module.exports = { initLogger, logError };
