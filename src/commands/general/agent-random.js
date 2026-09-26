const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const AGENTS = [
  { name: 'Astra', role: 'Contrôleur' },
  { name: 'Breach', role: 'Initiateur' },
  { name: 'Brimstone', role: 'Contrôleur' },
  { name: 'Chamber', role: 'Sentinelle' },
  { name: 'Clove', role: 'Contrôleur' },
  { name: 'Cypher', role: 'Sentinelle' },
  { name: 'Deadlock', role: 'Sentinelle' },
  { name: 'Fade', role: 'Initiateur' },
  { name: 'Gekko', role: 'Initiateur' },
  { name: 'Harbor', role: 'Contrôleur' },
  { name: 'Iso', role: 'Duelliste' },
  { name: 'Jett', role: 'Duelliste' },
  { name: 'KAY/O', role: 'Initiateur' },
  { name: 'Killjoy', role: 'Sentinelle' },
  { name: 'Neon', role: 'Duelliste' },
  { name: 'Omen', role: 'Contrôleur' },
  { name: 'Phoenix', role: 'Duelliste' },
  { name: 'Raze', role: 'Duelliste' },
  { name: 'Reyna', role: 'Duelliste' },
  { name: 'Sage', role: 'Sentinelle' },
  { name: 'Skye', role: 'Initiateur' },
  { name: 'Sova', role: 'Initiateur' },
  { name: 'Tejo', role: 'Initiateur' },
  { name: 'Viper', role: 'Contrôleur' },
  { name: 'Vyse', role: 'Sentinelle' },
  { name: 'Yoru', role: 'Duelliste' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('agent-random')
    .setDescription('Tire un agent Valorant au hasard.'),

  async execute(interaction) {
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];

    const embed = new EmbedBuilder()
      .setColor(0xff4655)
      .setTitle('🎲 Agent tiré au hasard')
      .setDescription(`**${agent.name}**\n${agent.role}`);

    await interaction.reply({ embeds: [embed] });
  }
};
