const { Events, MessageFlags } = require('discord.js');
const config = require('../config');
const { logError } = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    // Bot privé, un seul serveur : toute interaction qui viendrait d'ailleurs
    // (token/invite qui aurait fuité, bot ajouté à un autre serveur...) est
    // ignorée plutôt que traitée. Ne jamais se fier uniquement au fait que
    // Discord ne propose la commande que là où elle est déployée.
    if (interaction.guildId !== config.guildId) {
      console.warn(`Interaction ignorée hors serveur autorisé (guildId: ${interaction.guildId}).`);
      return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`Commande inconnue : ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      await logError(`Commande /${interaction.commandName}`, error);

      const errorReply = { content: 'Il y a eu une erreur en exécutant cette commande.', flags: MessageFlags.Ephemeral };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply).catch(() => {});
      } else {
        await interaction.reply(errorReply).catch(() => {});
      }
    }
  }
};
