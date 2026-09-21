const { EmbedBuilder, MessageFlags } = require('discord.js');
const { addXp, getRank, getLeaderboard, xpForLevel } = require('../xp');

// Effet de bord sur chaque message (hors spam) : gagne de l'XP et annonce un
// passage de niveau. N'empêche jamais le traitement du reste du message.
async function handleXpGain(message) {
  try {
    const xpResult = await addXp(message.author.id);

    if (xpResult?.leveledUp) {
      await message.channel.send(`🎉 ${message.author} passe **niveau ${xpResult.level}** !`);
    }
  } catch (error) {
    console.error(`Impossible de mettre à jour l'XP de ${message.author.tag} : ${error.message}`);
  }
}

// Retourne true si l'interaction a été traitée par ce module.
async function handleLevelingInteraction(interaction) {
  if (!interaction.isChatInputCommand()) {
    return false;
  }

  if (interaction.commandName === 'rank') {
    const targetUser = interaction.options.getUser('membre') ?? interaction.user;
    const rank = await getRank(targetUser.id);

    if (!rank) {
      await interaction.reply({
        content: "Le système de niveaux n'est pas configuré pour le moment.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const currentLevelXp = xpForLevel(rank.level);
    const nextLevelXp = xpForLevel(rank.level + 1);
    const progress = rank.xp - currentLevelXp;
    const needed = nextLevelXp - currentLevelXp;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📈 Niveau de ${targetUser.username}`)
      .addFields(
        { name: 'Niveau', value: `${rank.level}`, inline: true },
        { name: 'XP total', value: `${rank.xp}`, inline: true },
        { name: 'Progression', value: `${progress} / ${needed} XP vers le niveau ${rank.level + 1}` }
      );

    await interaction.reply({ embeds: [embed] });
    return true;
  }

  if (interaction.commandName === 'leaderboard') {
    const top = await getLeaderboard(10);

    if (top.length === 0) {
      await interaction.reply("Personne n'a encore gagné d'XP.");
      return true;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = await Promise.all(
      top.map(async (entry, i) => {
        const member = await interaction.guild.members.fetch(entry.userId).catch(() => null);
        const name = member ? member.user.username : `Utilisateur inconnu (${entry.userId})`;
        const rankIcon = medals[i] ?? `${i + 1}.`;
        return `${rankIcon} **${name}** — niveau ${entry.level} (${entry.xp} XP)`;
      })
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🏆 Classement des membres actifs')
      .setDescription(lines.join('\n'));

    await interaction.reply({ embeds: [embed] });
    return true;
  }

  return false;
}

module.exports = { handleXpGain, handleLevelingInteraction };
