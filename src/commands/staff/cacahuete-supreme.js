const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { isStaffMember } = require('../../utils/permissions');

const SUPREME_ROLE_ID = '1539941903397818388';
const SUPREME_ROLE_LABEL = 'Cacahuète Suprême'; // juste pour les messages affichés

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cacahuete-supreme')
    .setDescription('Couronne le gagnant du tournoi (staff uniquement).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option.setName('membre').setDescription('Le gagnant à couronner').setRequired(true)
    ),

  async execute(interaction) {
    // Ne jamais se fier uniquement à setDefaultMemberPermissions : on revérifie
    // explicitement le rôle staff dans le code.
    if (!isStaffMember(interaction.member)) {
      await interaction.reply({
        content: 'Seul le staff peut couronner un gagnant.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const winner = interaction.options.getMember('membre');

    if (!winner) {
      await interaction.reply({ content: 'Membre introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
      return;
    }

    const role = interaction.guild.roles.cache.get(SUPREME_ROLE_ID);

    if (!role) {
      await interaction.reply({
        content: `Le rôle ${SUPREME_ROLE_ID} n'existe pas sur ce serveur.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const botMember = interaction.guild.members.me;

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= botMember.roles.highest.position) {
      await interaction.reply({
        content: "Je n'ai pas la permission de gérer les rôles, ou mon rôle est plus bas que celui à attribuer.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      // Un seul titre à la fois : on le retire à qui l'avait avant.
      const previousHolders = role.members.filter((member) => member.id !== winner.id);
      await Promise.all(previousHolders.map((member) => member.roles.remove(role).catch(() => {})));

      await winner.roles.add(role);
    } catch (error) {
      console.error(`Impossible d'attribuer le rôle ${SUPREME_ROLE_LABEL} :`, error.message);
      await interaction.reply({ content: "Erreur lors de l'attribution du rôle.", flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🏆 Cacahuète Suprême !')
      .setDescription(`${winner} est couronné(e) **${SUPREME_ROLE_LABEL}** ! Félicitations pour la victoire du tournoi 🎉`)
      .setThumbnail(winner.user.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
