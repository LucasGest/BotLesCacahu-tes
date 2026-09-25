const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// Charge chaque commande depuis src/commands/<catégorie>/<nom>.js. Chaque
// fichier doit exporter { data: SlashCommandBuilder, execute(interaction) }.
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));

    if (!command.data || !command.execute) {
      console.warn(`La commande ${file} n'a pas de "data" ou "execute", ignorée.`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }
}

// Charge chaque event depuis src/events/<nom>.js. Chaque fichier doit
// exporter { name, once?, execute(...args) }.
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Filet de sécurité global : une erreur non gérée quelque part ne doit jamais
// planter tout le process (déni de service facile sinon), juste être loggée.
process.on('unhandledRejection', (error) => {
  console.error('Rejet de promesse non géré :', error);
});

process.on('uncaughtException', (error) => {
  console.error('Exception non gérée :', error);
});

// Serveur HTTP minimal : Render (free tier) exige un port ouvert pour
// considérer le service "actif".
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Les Cacahuètes bot is alive 🥜');
  })
  .listen(config.port, () => {
    console.log(`Serveur keep-alive en écoute sur le port ${config.port}.`);
  });

client.login(config.token).catch((error) => {
  // On logge le type d'erreur, jamais le token lui-même.
  console.error(`Échec de connexion à Discord : ${error.message}`);
  process.exit(1);
});
