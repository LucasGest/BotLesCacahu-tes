const { EmbedBuilder, MessageFlags } = require('discord.js');
const COMMANDS = require('../commands');

// Retourne true si l'interaction a été traitée par ce module.
async function handleGeneralInteraction(interaction, client) {
  if (!interaction.isChatInputCommand()) {
    return false;
  }

  if (interaction.commandName === 'ping') {
    await interaction.reply(`Pong ! Latence : ${client.ws.ping} ms`);
    return true;
  }

  if (interaction.commandName === 'hello') {
    await interaction.reply(`Salut ${interaction.user} !`);
    return true;
  }

  if (interaction.commandName === 'help') {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Commandes disponibles')
      .setDescription(
        COMMANDS.map(({ name, description }) => `**/${name}** — ${description}`).join('\n')
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return true;
  }

  return false;
}

// Réagit avec une emote de chat aléatoire quand un message contient "chat".
async function handleChatReaction(message) {
  if (!message.content.toLowerCase().includes('chat')) {
    return;
  }

  const chatEmojiNames = [
    'emoji_1', 'emoji_2', 'emoji_3', 'emoji_4',
    'emoji_5', 'emoji_6', 'emoji_7', 'emoji_8',
    'emoji_9', 'emoji_10', 'emoji_11', 'emoji_12',
    'emoji_13', 'emoji_14', 'emoji_15', 'emoji_16'
  ]; // ← mets ici les noms exacts de tes emotes
  const availableEmojis = message.guild?.emojis.cache.filter((e) =>
    chatEmojiNames.includes(e.name.toLowerCase())
  );

  const emoji =
    availableEmojis && availableEmojis.size > 0
      ? availableEmojis.random()
      : '🐱';

  try {
    await message.react(emoji);
  } catch (error) {
    console.error(`Impossible de réagir au message : ${error.message}`);
  }
}

module.exports = { handleGeneralInteraction, handleChatReaction };
