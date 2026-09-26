const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));

    if (!command.data) {
      console.warn(`La commande ${file} n'a pas de "data", ignorée.`);
      continue;
    }

    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  console.log(`Déploiement de ${commands.length} commande(s) slash...`);

  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });

  console.log('Commandes slash déployées avec succès.');
})();
