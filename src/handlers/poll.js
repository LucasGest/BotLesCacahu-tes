const { EmbedBuilder } = require('discord.js');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

// Retourne true si l'interaction a été traitée par ce module.
async function handlePollInteraction(interaction) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'poll') {
    return false;
  }

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

  return true;
}

module.exports = { handlePollInteraction };
