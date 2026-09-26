const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getRank, xpForLevel } = require('../../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Affiche ton niveau et ton XP, ou ceux d'un autre membre.")
    .addUserOption((option) =>
      option.setName('membre').setDescription('Le membre dont tu veux voir le niveau').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('membre') ?? interaction.user;
    const rank = await getRank(targetUser.id);

    if (!rank) {
      await interaction.reply({
        content: "Le système de niveaux n'est pas configuré pour le moment.",
        flags: MessageFlags.Ephemeral
      });
      return;
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
  }
};
