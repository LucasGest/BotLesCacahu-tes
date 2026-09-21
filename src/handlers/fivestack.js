const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

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

  const stackId = String(nextStackId++);
  activeStacks.set(stackId, {
    organizerId: interaction.user.id,
    placesNeeded,
    rank,
    note,
    joinedUserIds: new Set()
  });

  const embed = buildStackEmbed(activeStacks.get(stackId), interaction.user);

  await interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(buildJoinButton(stackId, false))]
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
