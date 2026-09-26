const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');
const config = require('../../config');
const { isStaffMember } = require('../../utils/permissions');
const { findExistingTicket, createTicketChannel, closeTicketChannel } = require('../../utils/tickets');

async function handleOpen(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const existing = findExistingTicket(interaction.guild, interaction.user.id, 'ticket-opener');

  if (existing) {
    await interaction.editReply(`Tu as déjà un ticket ouvert : ${existing}`);
    return;
  }

  const channel = await createTicketChannel(interaction.guild, interaction.member, {
    namePrefix: 'ticket',
    topicPrefix: 'ticket-opener'
  });

  const staffMentions = config.staffRoleIds.map((id) => `<@&${id}>`).join(' ');

  const closeButton = new ButtonBuilder()
    .setCustomId('ticket-setup:close')
    .setLabel('Fermer')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Nouveau ticket')
    .setDescription(`${interaction.user} a ouvert ce ticket. Décris ton problème, le staff va te répondre.`)
    .setTimestamp();

  await channel.send({
    content: `${interaction.user} ${staffMentions}`.trim(),
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(closeButton)]
  });

  await interaction.editReply(`Ticket créé : ${channel}`);
}

async function handleClose(interaction) {
  if (!isStaffMember(interaction.member)) {
    await interaction.reply({ content: 'Seul le staff peut fermer un ticket.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply('🔒 Fermeture et sauvegarde du ticket en cours...');
  await closeTicketChannel(interaction.channel, interaction.user);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription("Poste le message d'ouverture de ticket dans ce salon (staff uniquement).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!isStaffMember(interaction.member)) {
      await interaction.reply({ content: 'Seul le staff peut faire ça.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎫 Besoin d'aide ?")
      .setDescription('Clique sur le bouton ci-dessous pour ouvrir un ticket privé avec le staff.');

    const button = new ButtonBuilder()
      .setCustomId('ticket-setup:open')
      .setLabel('Ouvrir un ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary);

    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
  },

  async handleButton(interaction, action) {
    if (action === 'open') {
      await handleOpen(interaction);
      return;
    }

    if (action === 'close') {
      await handleClose(interaction);
    }
  }
};
