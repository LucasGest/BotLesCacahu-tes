const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const config = require('../../config');
const { isStaffMember } = require('../../utils/permissions');
const { findExistingTicket, createTicketChannel, closeTicketChannel } = require('../../utils/tickets');

const TRYOUT_ROLE_ID = '1539941587650609202';

async function showApplicationModal(interaction) {
  const existing = findExistingTicket(interaction.guild, interaction.user.id, 'candidature-opener');

  if (existing) {
    await interaction.reply({
      content: `Tu as déjà une candidature en cours : ${existing}`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const modal = new ModalBuilder().setCustomId('recrutement-setup:submit').setTitle('📝 Candidature');

  const pseudoInput = new TextInputBuilder()
    .setCustomId('pseudo')
    .setLabel('Pseudo Valorant (+ tag)')
    .setPlaceholder('Ex: Joueur#EUW1')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const rankInput = new TextInputBuilder()
    .setCustomId('rang')
    .setLabel('Rang actuel')
    .setPlaceholder('Ex: Diamant 2')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(30)
    .setRequired(true);

  const roleInput = new TextInputBuilder()
    .setCustomId('role')
    .setLabel('Rôle(s) joué(s)')
    .setPlaceholder('Ex: Duelliste, Initiateur')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const availabilityInput = new TextInputBuilder()
    .setCustomId('dispo')
    .setLabel('Disponibilités')
    .setPlaceholder('Ex: Soirs en semaine, week-ends')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const motivationInput = new TextInputBuilder()
    .setCustomId('motivation')
    .setLabel('Pourquoi nous rejoindre ?')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(500)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(pseudoInput),
    new ActionRowBuilder().addComponents(rankInput),
    new ActionRowBuilder().addComponents(roleInput),
    new ActionRowBuilder().addComponents(availabilityInput),
    new ActionRowBuilder().addComponents(motivationInput)
  );

  await interaction.showModal(modal);
}

async function handleSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const existing = findExistingTicket(interaction.guild, interaction.user.id, 'candidature-opener');

  if (existing) {
    await interaction.editReply(`Tu as déjà une candidature en cours : ${existing}`);
    return;
  }

  const pseudo = interaction.fields.getTextInputValue('pseudo');
  const rang = interaction.fields.getTextInputValue('rang');
  const role = interaction.fields.getTextInputValue('role');
  const dispo = interaction.fields.getTextInputValue('dispo');
  const motivation = interaction.fields.getTextInputValue('motivation');

  const channel = await createTicketChannel(interaction.guild, interaction.member, {
    namePrefix: 'candidature',
    topicPrefix: 'candidature-opener'
  });

  const embed = new EmbedBuilder()
    .setColor(0xff4655)
    .setTitle('📝 Nouvelle candidature')
    .addFields(
      { name: 'Candidat', value: `${interaction.user}`, inline: true },
      { name: 'Pseudo Valorant', value: pseudo, inline: true },
      { name: 'Rang', value: rang, inline: true },
      { name: 'Rôle(s)', value: role, inline: true },
      { name: 'Disponibilités', value: dispo, inline: true },
      { name: 'Motivation', value: motivation }
    )
    .setTimestamp();

  const acceptButton = new ButtonBuilder()
    .setCustomId(`recrutement-setup:accept:${interaction.user.id}`)
    .setLabel('Accepter en Tryout')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);

  const refuseButton = new ButtonBuilder()
    .setCustomId(`recrutement-setup:refuse:${interaction.user.id}`)
    .setLabel('Refuser')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Danger);

  const staffMentions = config.staffRoleIds.map((id) => `<@&${id}>`).join(' ');

  await channel.send({
    content: `${interaction.user} ${staffMentions}`.trim(),
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(acceptButton, refuseButton)]
  });

  await interaction.editReply(`Candidature envoyée : ${channel}`);
}

async function handleDecision(interaction, action) {
  if (!isStaffMember(interaction.member)) {
    await interaction.reply({ content: 'Seul le staff peut décider.', flags: MessageFlags.Ephemeral });
    return;
  }

  const accepted = action === 'accept';
  const candidateId = interaction.customId.split(':')[2];
  const candidate = await interaction.guild.members.fetch(candidateId).catch(() => null);

  if (accepted && candidate) {
    if (!TRYOUT_ROLE_ID) {
      console.warn('TRYOUT_ROLE_ID non configuré : rôle Tryout non attribué.');
    } else {
      const role = interaction.guild.roles.cache.get(TRYOUT_ROLE_ID);
      const botMember = interaction.guild.members.me;

      if (role && botMember.permissions.has(PermissionFlagsBits.ManageRoles) && role.position < botMember.roles.highest.position) {
        await candidate.roles.add(role).catch((error) => console.error("Impossible d'attribuer le rôle Tryout :", error.message));
      } else {
        console.warn('Rôle Tryout introuvable, ou permission/hiérarchie insuffisante pour l\'attribuer.');
      }
    }
  }

  const disabledAccept = new ButtonBuilder()
    .setCustomId(`recrutement-setup:accept:${candidateId}`)
    .setLabel('Accepter en Tryout')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success)
    .setDisabled(true);

  const disabledRefuse = new ButtonBuilder()
    .setCustomId(`recrutement-setup:refuse:${candidateId}`)
    .setLabel('Refuser')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(true);

  await interaction.update({ components: [new ActionRowBuilder().addComponents(disabledAccept, disabledRefuse)] });

  const resultEmbed = new EmbedBuilder()
    .setColor(accepted ? 0x57f287 : 0xed4245)
    .setDescription(
      accepted
        ? `✅ Candidature acceptée par ${interaction.user} — ${candidate ?? 'le candidat'} passe en Tryout !`
        : `❌ Candidature refusée par ${interaction.user}.`
    );

  await interaction.followUp({ embeds: [resultEmbed] });
  await closeTicketChannel(interaction.channel, interaction.user);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recrutement-setup')
    .setDescription('Poste le message de candidature dans ce salon (staff uniquement).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!isStaffMember(interaction.member)) {
      await interaction.reply({ content: 'Seul le staff peut faire ça.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff4655)
      .setTitle('📝 Rejoins la team !')
      .setDescription('Clique sur le bouton ci-dessous pour candidater.');

    const button = new ButtonBuilder()
      .setCustomId('recrutement-setup:open')
      .setLabel('Postuler')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Success);

    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
  },

  async handleButton(interaction, action) {
    if (action === 'open') {
      await showApplicationModal(interaction);
      return;
    }

    if (action === 'accept' || action === 'refuse') {
      await handleDecision(interaction, action);
    }
  },

  async handleModal(interaction, action) {
    if (action === 'submit') {
      await handleSubmit(interaction);
    }
  }
};
