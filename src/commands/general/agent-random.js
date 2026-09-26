const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAgents } = require('../../utils/valorantAgents');

const EMOJI_ROLE = {
  Duelliste: '⚔️',
  Initiateur: '🔍',
  Contrôleur: '🌫️',
  Sentinelle: '🛡️',
};

const PHRASES = [
  'Pas le choix, tu le joues. 😈',
  'Le destin a parlé. 🎲',
  'Bonne chance à tes mates… 🥜',
  'Aucune excuse si tu perds. 😏',
  'Cacabot a décidé, point final. 🤖',
];

function tirer(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

function creerEmbed(agent, user) {
  const emoji = EMOJI_ROLE[agent.role] ?? '🎯';
  const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];

  const embed = new EmbedBuilder()
    .setColor(agent.couleur)
    .setAuthor({ name: `${emoji} ${agent.role}`, iconURL: agent.roleIcon ?? undefined })
    .setTitle(`🎲 ${agent.name}`)
    .setDescription(`${user} va jouer **${agent.name}** !\n*${phrase}*`)
    .setFooter({ text: 'Cacabot • Les Cacahuètes 🥜' })
    .setTimestamp();

  if (agent.capacites?.length) {
    embed.addFields({ name: '✨ Capacités', value: agent.capacites.join(' · ') });
  }
  if (agent.icon) embed.setThumbnail(agent.icon);
  if (agent.portrait) embed.setImage(agent.portrait);

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('agent-random')
    .setDescription('Tire un agent Valorant au hasard.')
    .addStringOption((opt) =>
      opt
        .setName('role')
        .setDescription('Limiter le tirage à un rôle')
        .addChoices(
          { name: '⚔️ Duelliste', value: 'Duelliste' },
          { name: '🔍 Initiateur', value: 'Initiateur' },
          { name: '🌫️ Contrôleur', value: 'Contrôleur' },
          { name: '🛡️ Sentinelle', value: 'Sentinelle' },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const roleChoisi = interaction.options.getString('role');
    const tous = getAgents();
    const liste = roleChoisi ? tous.filter((a) => a.role === roleChoisi) : tous;

    if (!liste.length) {
      return interaction.editReply('😕 Aucun agent trouvé pour ce rôle.');
    }

    const agent = tirer(liste);
    await interaction.editReply({ embeds: [creerEmbed(agent, interaction.user)] });
  },
};
