const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

// Salon où poster les annonces (toujours le même, peu importe où la commande
// est tapée) et rôle à ping pour prévenir les joueurs disponibles.
const FIVESTACK_CHANNEL_ID = '1539942114660450374';
const FIVESTACK_ROLE_ID = '1539944509566357557';

// État en mémoire par annonce : pas besoin de survivre à un redémarrage, une
// annonce de 5-stack n'a de sens que pour la session de jeu en cours.
const activeStacks = new Map();
let nextStackId = 1;

function buildStackEmbed(stack, organizerUser) {
  const remaining = stack.placesNeeded - stack.joinedUserIds.size;

  const embed = new EmbedBuilder()
    .setColor(0xff4655)
    .setTitle('🔥 Recherche de joueurs pour un 5-stack !')
    .addFields(
      { name: 'Organisateur', value: `${organizerUser}`, inline: true },
      { name: 'Places restantes', value: `${remaining} / ${stack.placesNeeded}`, inline: true }
    );

  if (stack.rank) {
    embed.addFields({ name: 'Rang recherché', value: stack.rank, inline: true });
  }

  if (stack.note) {
    embed.addFields({ name: 'Message', value: stack.note });
  }

  const joinedList =
    stack.joinedUserIds.size > 0
      ? [...stack.joinedUserIds].map((id) => `<@${id}>`).join('\n')
      : 'Personne pour l\'instant';

  embed.addFields({ name: 'Joueurs inscrits', value: joinedList }).setTimestamp();

  return embed;
}

function buildJoinButton(stackId, full) {
  return new ButtonBuilder()
    .setCustomId(`fivestack_join_${stackId}`)
    .setLabel(full ? '✅ 5-stack complet !' : '✋ Je suis chaud')
    .setStyle(full ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(full);
}

async function handleFivestackCommand(interaction) {
  const placesNeeded = interaction.options.getInteger('places');
  const rank = interaction.options.getString('rang');
  const note = interaction.options.getString('note');

  const channel = await interaction.client.channels.fetch(FIVESTACK_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    await interaction.reply({
      content: "Le salon des annonces 5-stack est introuvable, préviens un admin.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const stackId = String(nextStackId++);
  activeStacks.set(stackId, {
    organizerId: interaction.user.id,
    placesNeeded,
    rank,
    note,
    joinedUserIds: new Set()
  });

  const embed = buildStackEmbed(activeStacks.get(stackId), interaction.user);

  const announcement = await channel.send({
    content: `<@&${FIVESTACK_ROLE_ID}>`,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(buildJoinButton(stackId, false))]
  });

  await interaction.reply({
    content: `Annonce postée : ${announcement.url}`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleJoinButton(interaction, stackId) {
  const stack = activeStacks.get(stackId);

  if (!stack) {
    await interaction.reply({ content: 'Cette annonce a expiré.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.user.id === stack.organizerId) {
    await interaction.reply({
      content: "C'est toi qui organises, pas besoin de cliquer !",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (stack.joinedUserIds.has(interaction.user.id)) {
    await interaction.reply({ content: 'Tu es déjà inscrit sur ce 5-stack.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (stack.joinedUserIds.size >= stack.placesNeeded) {
    await interaction.reply({ content: "Il n'y a plus de place, désolé.", flags: MessageFlags.Ephemeral });
    return;
  }

  stack.joinedUserIds.add(interaction.user.id);

  const organizer = await interaction.client.users.fetch(stack.organizerId);
  const full = stack.joinedUserIds.size >= stack.placesNeeded;
  const embed = buildStackEmbed(stack, organizer);

  await interaction.update({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(buildJoinButton(stackId, full))]
  });

  if (full) {
    // Le bouton est désactivé côté message, plus la peine de garder l'état.
    activeStacks.delete(stackId);
    await interaction.followUp(`🎮 5-stack complet ! ${organizer}, c'est parti.`);
  } else {
    await interaction.followUp({ content: `${interaction.user} rejoint le 5-stack !`, flags: MessageFlags.Ephemeral });
  }
}

// Retourne true si l'interaction a été traitée par ce module.
async function handleFivestackInteraction(interaction) {
  if (interaction.isChatInputCommand() && interaction.commandName === 'fivestack') {
    await handleFivestackCommand(interaction);
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith('fivestack_join_')) {
    const stackId = interaction.customId.replace('fivestack_join_', '');
    await handleJoinButton(interaction, stackId);
    return true;
  }

  return false;
}

module.exports = { handleFivestackInteraction };
