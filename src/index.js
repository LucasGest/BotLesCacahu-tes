require('dotenv').config();

const http = require('http');
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { startTwitchWatcher } = require('./twitch-alerts');
const { initFirebase } = require('./xp');
const { handleGuildMemberAdd } = require('./handlers/welcome');
const { handleSpamCheck, handleMentionModeration } = require('./handlers/moderation');
const { handleXpGain, handleLevelingInteraction } = require('./handlers/leveling');
const { handleGeneralInteraction, handleChatReaction } = require('./handlers/general');
const { handlePollInteraction } = require('./handlers/poll');
const { handlePartycodeInteraction } = require('./handlers/partycode');
const { handleTicketInteraction } = require('./handlers/tickets');
const { handleFivestackInteraction } = require('./handlers/fivestack');

// Variables obligatoires : le bot ne démarre pas si l'une d'elles manque,
// plutôt que de planter plus tard avec une erreur obscure.
const REQUIRED_ENV_VARS = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
const missingVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  throw new Error(
    `Variables d'environnement manquantes : ${missingVars.join(', ')}. Vérifie ton fichier .env (jamais commité !).`
  );
}

const token = process.env.DISCORD_TOKEN;

initFirebase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Connecte en tant que ${readyClient.user.tag}`);
  startTwitchWatcher(client);
});

client.on(Events.GuildMemberAdd, handleGuildMemberAdd);

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    return;
  }

  if (await handleSpamCheck(message)) {
    return;
  }

  await handleXpGain(message);
  await handleMentionModeration(message, client);
  await handleChatReaction(message);
});

// Chaque handler renvoie true s'il a pris en charge l'interaction, ce qui
// arrête la chaîne : un seul module doit répondre à une interaction donnée.
client.on(Events.InteractionCreate, async (interaction) => {
  if (await handleGeneralInteraction(interaction, client)) return;
  if (await handleLevelingInteraction(interaction)) return;
  if (await handlePollInteraction(interaction)) return;
  if (await handlePartycodeInteraction(interaction)) return;
  if (await handleTicketInteraction(interaction, client)) return;
  if (await handleFivestackInteraction(interaction)) return;
});

// Filet de sécurité global : une erreur non gérée quelque part ne doit jamais
// planter tout le process (déni de service facile sinon), juste être logguée.
process.on('unhandledRejection', (error) => {
  console.error('Rejet de promesse non géré :', error);
});

process.on('uncaughtException', (error) => {
  console.error('Exception non gérée :', error);
});

// Serveur HTTP minimal : Render (free tier) exige un port ouvert pour
// considérer le service "actif", et un outil comme UptimeRobot peut pinguer
// cette route toutes les X minutes pour empêcher la mise en veille automatique.
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Les Cacahuètes bot is alive 🥜');
  })
  .listen(PORT, () => {
    console.log(`Serveur keep-alive en écoute sur le port ${PORT}.`);
  });

client.login(token).catch((error) => {
  // On logge le type d'erreur, jamais le token lui-même.
  console.error(`Échec de connexion à Discord : ${error.message}`);
  process.exit(1);
});
