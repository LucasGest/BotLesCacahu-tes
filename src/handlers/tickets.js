const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder
} = require('discord.js');
const { STAFF_ROLE_NAMES, findStaffRoles, isStaffMember } = require('../staff');

// Catégorie et salon d'archives pour les tickets. Les rôles staff sont
// définis dans src/staff.js (partagés avec la modération).
const TICKET_CATEGORY_NAME = '🎫 Tickets';
const TICKET_ARCHIVE_CHANNEL_ID = '1551289156527988817';

async function getOrCreateCategory(guild, name) {
  let category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name
  );

  if (!category) {
    category = await guild.channels.create({ name, type: ChannelType.GuildCategory });
  }

  return category;
}

async function getArchiveChannel(guild) {
  return guild.channels.cache.get(TICKET_ARCHIVE_CHANNEL_ID) ?? guild.channels.fetch(TICKET_ARCHIVE_CHANNEL_ID);
}

// Récupère l'historique du salon avant sa suppression et le met en forme en
// texte brut, pour garder une trace des candidatures une fois le ticket fermé.
async function buildTicketTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = sorted.map((message) => {
    const time = new Date(message.createdTimestamp).toLocaleString('fr-FR');
    const parts = [];

    if (message.content) {
      parts.push(message.content);
    }

    for (const embed of message.embeds) {
      if (embed.title) {
        parts.push(`[${embed.title}]`);
      }
      if (embed.description) {
        parts.push(embed.description);
      }
      for (const field of embed.fields) {
        parts.push(`${field.name}: ${field.value}`);
      }
    }

    return `[${time}] ${message.author.tag}: ${parts.join(' | ') || '(message sans texte)'}`;
  });

  return lines.join('\n') || '(salon vide)';
}

async function handleTicketSetupCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xff4655)
    .setTitle('🎮 Recrutement Valorant')
    .setDescription(
      "Tu veux rejoindre l'équipe ? Clique sur le bouton ci-dessous pour ouvrir un ticket et candidater."
    );

  const openButton = new ButtonBuilder()
    .setCustomId('open_ticket')
    .setLabel('🎫 Ouvrir un ticket')
    .setStyle(ButtonStyle.Success);

  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(openButton)]
  });
}

async function handleOpenTicketButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('ticket_modal')
    .setTitle('🎮 Candidature recrutement');

  const pseudoInput = new TextInputBuilder()
    .setCustomId('ticket_pseudo')
    .setLabel('Pseudo Valorant (+ tag)')
    .setPlaceholder('Ex: Joueur#EUW1')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const rankInput = new TextInputBuilder()
    .setCustomId('ticket_rank')
    .setLabel('Rang actuel')
    .setPlaceholder('Ex: Diamant 2')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const roleInput = new TextInputBuilder()
    .setCustomId('ticket_role')
    .setLabel('Rôle(s) joué(s)')
    .setPlaceholder('Ex: Duelliste, Initiateur')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const availabilityInput = new TextInputBuilder()
    .setCustomId('ticket_availability')
    .setLabel('Disponibilités')
    .setPlaceholder('Ex: Soirs en semaine, week-ends')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(pseudoInput),
    new ActionRowBuilder().addComponents(rankInput),
    new ActionRowBuilder().addComponents(roleInput),
    new ActionRowBuilder().addComponents(availabilityInput)
  );

  await interaction.showModal(modal);
}

async function handleTicketModalSubmit(interaction, client) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const pseudo = interaction.fields.getTextInputValue('ticket_pseudo');
    const rank = interaction.fields.getTextInputValue('ticket_rank');
    const role = interaction.fields.getTextInputValue('ticket_role');
    const availability = interaction.fields.getTextInputValue('ticket_availability');

    const { guild } = interaction;

    // Un joueur ne peut avoir qu'un ticket ouvert à la fois : on le retrouve
    // via le topic du salon plutôt que de stocker un état à part.
    const existing = guild.channels.cache.find(
      (channel) => channel.topic === `ticket-opener:${interaction.user.id}`
    );

    if (existing) {
      await interaction.editReply(`Tu as déjà un ticket ouvert : ${existing}`);
      return;
    }

    const staffRoles = findStaffRoles(guild);

    if (staffRoles.length === 0) {
      console.warn(
        `Aucun des rôles staff (${STAFF_ROLE_NAMES.join(', ')}) n'a été trouvé sur ${guild.name}.`
      );
    }

    const category = await getOrCreateCategory(guild, TICKET_CATEGORY_NAME);

    const safeName = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const ticketAccess = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory
    ];

    const ticketChannel = await guild.channels.create({
      name: `ticket-${safeName || interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `ticket-opener:${interaction.user.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: ticketAccess },
        { id: client.user.id, allow: ticketAccess },
        ...staffRoles.map((staffRole) => ({ id: staffRole.id, allow: ticketAccess }))
      ]
    });

    const summaryEmbed = new EmbedBuilder()
      .setColor(0xff4655)
      .setTitle('🎮 Nouvelle candidature')
      .addFields(
        { name: 'Candidat', value: `${interaction.user}`, inline: true },
        { name: 'Pseudo Valorant', value: pseudo, inline: true },
        { name: 'Rang', value: rank, inline: true },
        { name: 'Rôle(s) joué(s)', value: role, inline: true }
      )
      .setTimestamp();

    if (availability) {
      summaryEmbed.addFields({ name: 'Disponibilités', value: availability });
    }

    const claimButton = new ButtonBuilder()
      .setCustomId('claim_ticket')
      .setLabel('🙋 Prise en charge')
      .setStyle(ButtonStyle.Primary);

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Fermer le ticket')
      .setStyle(ButtonStyle.Danger);

    const staffMentions = staffRoles.map((staffRole) => `<@&${staffRole.id}>`).join(' ');

    await ticketChannel.send({
      content: `${interaction.user} ${staffMentions}`.trim(),
      embeds: [summaryEmbed],
      components: [new ActionRowBuilder().addComponents(claimButton, closeButton)]
    });

    await interaction.editReply(`Ticket créé : ${ticketChannel}`);
  } catch (error) {
    console.error('Erreur complète /ticket (création) :', error);
    await interaction.editReply("Impossible de créer ton ticket, désolé 😿");
  }
}

async function handleClaimTicketButton(interaction) {
  if (!isStaffMember(interaction.member)) {
    await interaction.reply({
      content: 'Seul le staff peut prendre en charge un ticket.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const claimedButton = new ButtonBuilder()
    .setCustomId('claim_ticket')
    .setLabel(`Pris en charge par ${interaction.user.username}`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('🔒 Fermer le ticket')
    .setStyle(ButtonStyle.Danger);

  await interaction.update({
    components: [new ActionRowBuilder().addComponents(claimedButton, closeButton)]
  });

  await interaction.followUp(`🙋 Ticket pris en charge par ${interaction.user} !`);
}

async function handleCloseTicketButton(interaction) {
  if (!isStaffMember(interaction.member)) {
    await interaction.reply({
      content: 'Seul le staff peut fermer un ticket.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.reply('🔒 Fermeture et sauvegarde du ticket en cours...');

  try {
    const transcript = await buildTicketTranscript(interaction.channel);
    const archiveChannel = await getArchiveChannel(interaction.guild);
    const openerId = interaction.channel.topic?.replace('ticket-opener:', '') ?? null;
    const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), {
      name: `${interaction.channel.name}.txt`
    });

    await archiveChannel.send({
      content:
        `📁 Ticket **#${interaction.channel.name}** fermé par ${interaction.user}` +
        (openerId ? ` (candidat : <@${openerId}>)` : ''),
      files: [attachment]
    });
  } catch (error) {
    console.error('Impossible de sauvegarder le transcript du ticket :', error.message);
  }

  setTimeout(() => {
    interaction.channel.delete().catch((error) => {
      console.error('Impossible de supprimer le salon de ticket :', error.message);
    });
  }, 5000);
}

// Retourne true si l'interaction a été traitée par ce module.
async function handleTicketInteraction(interaction, client) {
  if (interaction.isChatInputCommand() && interaction.commandName === 'ticket-setup') {
    await handleTicketSetupCommand(interaction);
    return true;
  }

  if (interaction.isButton() && interaction.customId === 'open_ticket') {
    await handleOpenTicketButton(interaction);
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
    await handleTicketModalSubmit(interaction, client);
    return true;
  }

  if (interaction.isButton() && interaction.customId === 'claim_ticket') {
    await handleClaimTicketButton(interaction);
    return true;
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await handleCloseTicketButton(interaction);
    return true;
  }

  return false;
}

module.exports = { handleTicketInteraction };
