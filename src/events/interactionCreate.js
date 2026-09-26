const { Events, MessageFlags } = require('discord.js');
const config = require('../config');
const { logError } = require('../utils/logger');

// Convention pour les customId des boutons/modals liés à une commande :
// "<nom-de-la-commande>:<action>:<extra...>". On route vers la commande
// correspondante dans client.commands, qui peut exporter handleButton et/ou
// handleModal en plus de execute. Ça évite un fichier séparé par bouton.
async function routeComponentInteraction(interaction) {
  const [commandName, action] = interaction.customId.split(':');
  const command = interaction.client.commands.get(commandName);

  if (!command) {
    console.warn(`customId sans commande correspondante : ${interaction.customId}`);
    return;
  }

  if (interaction.isButton() && command.handleButton) {
    await command.handleButton(interaction, action);
  } else if (interaction.isModalSubmit() && command.handleModal) {
    await command.handleModal(interaction, action);
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Bot privé, un seul serveur : toute interaction qui viendrait d'ailleurs
    // (token/invite qui aurait fuité, bot ajouté à un autre serveur...) est
    // ignorée plutôt que traitée. Ne jamais se fier uniquement au fait que
    // Discord ne propose la commande que là où elle est déployée.
    if (interaction.guildId !== config.guildId) {
      console.warn(`Interaction ignorée hors serveur autorisé (guildId: ${interaction.guildId}).`);
      return;
    }

    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
          console.warn(`Commande inconnue : ${interaction.commandName}`);
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (interaction.isButton() || interaction.isModalSubmit()) {
        await routeComponentInteraction(interaction);
      }
    } catch (error) {
      const label = interaction.isChatInputCommand()
        ? `Commande /${interaction.commandName}`
        : `Interaction ${interaction.customId}`;
      await logError(label, error);

      const errorReply = { content: 'Il y a eu une erreur en exécutant cette action.', flags: MessageFlags.Ephemeral };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply).catch(() => {});
      } else {
        await interaction.reply(errorReply).catch(() => {});
      }
    }
  }
};
