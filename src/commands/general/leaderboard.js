const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des membres les plus actifs.'),

  async execute(interaction) {
    const top = await getLeaderboard(10);

    if (top.length === 0) {
      await interaction.reply("Personne n'a encore gagné d'XP.");
      return;
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
  }
};
