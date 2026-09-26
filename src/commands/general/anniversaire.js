const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const birthdays = require('../../utils/birthdays');

const DAYS_PER_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anniversaire')
    .setDescription('Gère ton anniversaire.')
    .addSubcommand((sub) =>
      sub
        .setName('definir')
        .setDescription("Enregistre ta date d'anniversaire (jour + mois, pas d'année).")
        .addIntegerOption((option) =>
          option.setName('jour').setDescription('Jour (1-31)').setRequired(true).setMinValue(1).setMaxValue(31)
        )
        .addIntegerOption((option) =>
          option.setName('mois').setDescription('Mois (1-12)').setRequired(true).setMinValue(1).setMaxValue(12)
        )
    )
    .addSubcommand((sub) => sub.setName('retirer').setDescription('Supprime ta date enregistrée.')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'definir') {
      const jour = interaction.options.getInteger('jour');
      const mois = interaction.options.getInteger('mois');

      if (jour > DAYS_PER_MONTH[mois - 1]) {
        await interaction.reply({
          content: `Le mois ${mois} n'a pas ${jour} jours.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      birthdays.setBirthday(interaction.user.id, jour, mois);
      await interaction.reply({
        content: `🎂 Anniversaire enregistré : ${jour}/${mois}. On te le souhaitera le jour J !`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (sub === 'retirer') {
      birthdays.removeBirthday(interaction.user.id);
      await interaction.reply({ content: 'Anniversaire supprimé.', flags: MessageFlags.Ephemeral });
    }
  }
};
