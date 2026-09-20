require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const { DISCORD_TOKEN: token, DISCORD_CLIENT_ID: clientId, DISCORD_GUILD_ID: guildId } = process.env;

if (!token || !clientId || !guildId) {
  throw new Error('DISCORD_TOKEN, DISCORD_CLIENT_ID et DISCORD_GUILD_ID sont requis dans .env.');
}

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Répond avec la latence du bot.'),
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Le bot te salue.'),
  new SlashCommandBuilder()
    .setName('partycode')
    .setDescription('Partage un code de groupe Valorant avec un joli formulaire.'),
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Fait rejoindre ton vocal au bot et joue une musique.')
    .addStringOption((option) =>
      option
        .setName('recherche')
        .setDescription('Lien YouTube ou nom de la musique à chercher')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Fait quitter le vocal au bot.')
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  console.log('Déploiement des commandes slash...');

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );

  console.log('Commandes slash déployées avec succès.');
})();