const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');

// Retourne true si l'interaction a été traitée par ce module.
async function handlePartycodeInteraction(interaction) {
  if (interaction.isChatInputCommand() && interaction.commandName === 'partycode') {
    const modal = new ModalBuilder()
      .setCustomId('partycode_modal')
      .setTitle('🎮 Partager un code de groupe');

    const codeInput = new TextInputBuilder()
      .setCustomId('partycode_code')
      .setLabel('Code du groupe')
      .setPlaceholder('Ex: ABC123')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(20)
      .setRequired(true);

    const modeInput = new TextInputBuilder()
      .setCustomId('partycode_mode')
      .setLabel('Mode de jeu')
      .setPlaceholder('Ex: Compétitif, Non-classé, Deathmatch...')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const slotsInput = new TextInputBuilder()
      .setCustomId('partycode_slots')
      .setLabel('Places disponibles')
      .setPlaceholder('Ex: 2/5')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const noteInput = new TextInputBuilder()
      .setCustomId('partycode_note')
      .setLabel('Message (optionnel)')
      .setPlaceholder('Ex: On monte en rang ce soir, viens tranquille !')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(codeInput),
      new ActionRowBuilder().addComponents(modeInput),
      new ActionRowBuilder().addComponents(slotsInput),
      new ActionRowBuilder().addComponents(noteInput)
    );

    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'partycode_modal') {
    const code = interaction.fields.getTextInputValue('partycode_code');
    const mode = interaction.fields.getTextInputValue('partycode_mode');
    const slots = interaction.fields.getTextInputValue('partycode_slots');
    const note = interaction.fields.getTextInputValue('partycode_note');

    const embed = new EmbedBuilder()
      .setColor(0xff4655) // rouge Valorant
      .setTitle('🎮 Nouvelle partie Valorant !')
      .addFields({ name: 'Code du groupe', value: `\`${code}\``, inline: true });

    if (mode) {
      embed.addFields({ name: 'Mode', value: mode, inline: true });
    }

    if (slots) {
      embed.addFields({ name: 'Places', value: slots, inline: true });
    }

    if (note) {
      embed.addFields({ name: 'Message', value: note });
    }

    embed
      .setFooter({
        text: `Partagé par ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    const copyButton = new ButtonBuilder()
      .setCustomId(`copy_partycode_${code}`)
      .setLabel('📋 Copier le code')
      .setStyle(ButtonStyle.Secondary);

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(copyButton)]
    });
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith('copy_partycode_')) {
    const code = interaction.customId.replace('copy_partycode_', '');

    await interaction.reply({
      content: `\`${code}\``,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  return false;
}

module.exports = { handlePartycodeInteraction };
