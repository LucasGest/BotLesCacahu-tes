// Rôles considérés comme "staff" : accès aux tickets, exemptés de certaines
// actions de modération automatique. Résolus par nom (pas par ID) pour
// rester simples à retoucher sans .env.
const STAFF_ROLE_NAMES = [
  'Recrutement',
  'Staff de la cacahuète',
  'Grand Patron de la Cacahuète',
  'Co-Patron de la Cacahuète'
];

// Comparaison normalisée : les accents peuvent être encodés différemment
// (NFC vs NFD) entre ce fichier et le nom du rôle tel que Discord le
// renvoie, ce qui fait échouer un === strict sans que rien ne le signale.
const normalizeName = (value) => value.normalize('NFC').trim().toLowerCase();

function findStaffRoles(guild) {
  return STAFF_ROLE_NAMES
    .map((name) => guild.roles.cache.find((r) => normalizeName(r.name) === normalizeName(name)))
    .filter(Boolean);
}

function isStaffMember(member) {
  const staffRoleIds = new Set(findStaffRoles(member.guild).map((role) => role.id));
  return member.roles.cache.some((role) => staffRoleIds.has(role.id));
}

module.exports = { STAFF_ROLE_NAMES, findStaffRoles, isStaffMember };
