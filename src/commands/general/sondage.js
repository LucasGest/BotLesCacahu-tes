const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sondage')
    .setDescription('Crée un sondage rapide (map, heure de event...) avec jusqu\'à 5 options.')
    .addStringOption((option) => option.setName('question').setDescription('La question du sondage').setRequired(true))
    .addStringOption((option) => option.setName('option1').setDescription('Première option').setRequired(true))
    .addStringOption((option) => option.setName('option2').setDescription('Deuxième option').setRequired(true))
    .addStringOption((option) => option.setName('option3').setDescription('Troisième option (optionnel)').setRequired(false))
    .addStringOption((option) => option.setName('option4').setDescription('Quatrième option (optionnel)').setRequired(false))
    .addStringOption((option) => option.setName('option5').setDescription('Cinquième option (optionnel)').setRequired(false)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const options = ['1', '2', '3', '4', '5']
      .map((n) => interaction.options.getString(`option${n}`))
      .filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${question}`)
      .setDescription(options.map((option, i) => `${NUMBER_EMOJIS[i]} ${option}`).join('\n'))
      .setFooter({ text: `Sondage lancé par ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    const pollMessage = await interaction.fetchReply();

    for (let i = 0; i < options.length; i++) {
      await pollMessage.react(NUMBER_EMOJIS[i]);
    }
  }
};
