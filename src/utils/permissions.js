const config = require('../config');

// Ne jamais se fier uniquement à setDefaultMemberPermissions (Discord) pour
// protéger une action sensible : un membre peut se retrouver avec la bonne
// permission Discord sans être "staff" au sens du serveur, ou l'inverse. Les
// futurs boutons/commandes staff (tickets, candidatures...) doivent appeler
// isStaffMember(member) en plus de la vérification de permission Discord.
function isStaffMember(member) {
  if (!member || config.staffRoleIds.length === 0) {
    return false;
  }

  return member.roles.cache.some((role) => config.staffRoleIds.includes(role.id));
}

module.exports = { isStaffMember };
