const { MessageFlags } = require('discord.js');

async function handleKickCommand(interaction) {
  const member = interaction.options.getMember('membre');
  const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';

  if (!member) {
    await interaction.reply({ content: 'Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
    return;
  }

  // kickable === false si le bot n'a pas la permission ou si le rôle de la
  // cible est plus haut que celui du bot : évite un crash inutile.
  if (!member.kickable) {
    await interaction.reply({
      content: "Je ne peux pas expulser ce membre (rôle trop haut, ou permission manquante).",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await member.kick(reason);
    await interaction.reply(`👢 **${member.user.tag}** a été expulsé. Raison : ${reason}`);
  } catch (error) {
    console.error(`Impossible d'expulser ${member.user.tag} : ${error.message}`);
    await interaction.reply({ content: "Erreur lors de l'expulsion.", flags: MessageFlags.Ephemeral });
  }
}

async function handleBanCommand(interaction) {
  const member = interaction.options.getMember('membre');
  const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';

  if (!member) {
    await interaction.reply({ content: 'Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!member.bannable) {
    await interaction.reply({
      content: "Je ne peux pas bannir ce membre (rôle trop haut, ou permission manquante).",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await member.ban({ reason });
    await interaction.reply(`🔨 **${member.user.tag}** a été banni. Raison : ${reason}`);
  } catch (error) {
    console.error(`Impossible de bannir ${member.user.tag} : ${error.message}`);
    await interaction.reply({ content: 'Erreur lors du bannissement.', flags: MessageFlags.Ephemeral });
  }
}

async function handleTimeoutCommand(interaction) {
  const member = interaction.options.getMember('membre');
  const minutes = interaction.options.getInteger('minutes');
  const reason = interaction.options.getString('raison') ?? 'Aucune raison fournie';

  if (!member?.moderatable) {
    await interaction.reply({
      content: "Je ne peux pas mute ce membre (rôle trop haut, ou permission manquante).",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await member.timeout(minutes * 60_000, reason);
    await interaction.reply(`🔇 **${member.user.tag}** est mute pendant ${minutes} min. Raison : ${reason}`);
  } catch (error) {
    console.error(`Impossible de mute ${member.user.tag} : ${error.message}`);
    await interaction.reply({ content: 'Erreur lors du mute.', flags: MessageFlags.Ephemeral });
  }
}

async function handleUnmuteCommand(interaction) {
  const member = interaction.options.getMember('membre');

  if (!member?.moderatable) {
    await interaction.reply({
      content: "Je ne peux pas démute ce membre (rôle trop haut, ou permission manquante).",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await member.timeout(null, 'Démute manuel');
    await interaction.reply(`🔊 **${member.user.tag}** a été démute.`);
  } catch (error) {
    console.error(`Impossible de démute ${member.user.tag} : ${error.message}`);
    await interaction.reply({ content: 'Erreur lors du démute.', flags: MessageFlags.Ephemeral });
  }
}

async function handleWarnCommand(interaction) {
  const member = interaction.options.getMember('membre');
  const reason = interaction.options.getString('raison');

  if (!member) {
    await interaction.reply({ content: 'Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
    return;
  }

  // Les DM peuvent être fermés : pas bloquant, l'avertissement reste posté
  // dans le salon dans tous les cas.
  await member
    .send(`⚠️ Tu as reçu un avertissement sur **${interaction.guild.name}**.\nRaison : ${reason}`)
    .catch(() => {});

  await interaction.reply(`⚠️ **${member.user.tag}** a été averti. Raison : ${reason}`);
}

async function handleClearCommand(interaction) {
  const amount = interaction.options.getInteger('nombre');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Le "true" ignore silencieusement les messages de plus de 14 jours
    // (Discord refuse de les bulk-delete) plutôt que de faire échouer tout le lot.
    const deleted = await interaction.channel.bulkDelete(amount, true);
    await interaction.editReply(`🧹 ${deleted.size} message(s) supprimé(s).`);
  } catch (error) {
    console.error(`Impossible de supprimer des messages : ${error.message}`);
    await interaction.editReply('Erreur lors de la suppression des messages.');
  }
}

// Retourne true si l'interaction a été traitée par ce module.
async function handleModerationInteraction(interaction) {
  if (!interaction.isChatInputCommand()) {
    return false;
  }

  switch (interaction.commandName) {
    case 'kick':
      await handleKickCommand(interaction);
      return true;
    case 'ban':
      await handleBanCommand(interaction);
      return true;
    case 'timeout':
      await handleTimeoutCommand(interaction);
      return true;
    case 'unmute':
      await handleUnmuteCommand(interaction);
      return true;
    case 'warn':
      await handleWarnCommand(interaction);
      return true;
    case 'clear':
      await handleClearCommand(interaction);
      return true;
    default:
      return false;
  }
}

module.exports = { handleModerationInteraction };
