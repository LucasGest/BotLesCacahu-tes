require('dotenv').config();

const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const COMMANDS = require('./commands');

const { DISCORD_TOKEN: token, DISCORD_CLIENT_ID: clientId, DISCORD_GUILD_ID: guildId } = process.env;

if (!token || !clientId || !guildId) {
  throw new Error('DISCORD_TOKEN, DISCORD_CLIENT_ID et DISCORD_GUILD_ID sont requis dans .env.');
}

const commands = COMMANDS.map(({ name, description, adminOnly, options }) => {
  const builder = new SlashCommandBuilder().setName(name).setDescription(description);

  if (adminOnly) {
    // Masque la commande dans le picker Discord pour qui n'a pas la permission.
    builder.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
  }

  for (const option of options ?? []) {
    const addOption = option.type === 'user' ? 'addUserOption' : 'addStringOption';

    builder[addOption]((builtOption) =>
      builtOption
        .setName(option.name)
        .setDescription(option.description)
        .setRequired(Boolean(option.required))
    );
  }

  return builder.toJSON();
});

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  console.log('Déploiement des commandes slash...');

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );

  console.log('Commandes slash déployées avec succès.');
})();