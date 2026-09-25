// Liste centrale des commandes slash : utilisée à la fois pour les déployer
// (deploy-commands.js) et pour les afficher dans /help, afin que les deux
// restent toujours synchronisées.
module.exports = [
  { name: 'ping', description: 'Répond avec la latence du bot.' },
  { name: 'hello', description: 'Le bot te salue.' },
  { name: 'partycode', description: 'Partage un code de groupe Valorant avec un joli formulaire.' },
  {
    name: 'ticket-setup',
    description: "Poste le message d'ouverture de ticket de recrutement dans ce salon (staff uniquement).",
    defaultPermission: 'ManageChannels'
  },
  {
    name: 'poll',
    description: 'Crée un sondage rapide (jusqu\'à 5 options).',
    options: [
      { name: 'question', description: 'La question du sondage', required: true },
      { name: 'option1', description: 'Première option', required: true },
      { name: 'option2', description: 'Deuxième option', required: true },
      { name: 'option3', description: 'Troisième option (optionnel)', required: false },
      { name: 'option4', description: 'Quatrième option (optionnel)', required: false },
      { name: 'option5', description: 'Cinquième option (optionnel)', required: false }
    ]
  },
  {
    name: 'rank',
    description: "Affiche ton niveau et ton XP, ou ceux d'un autre membre.",
    options: [
      { name: 'membre', description: 'Le membre dont tu veux voir le niveau', required: false, type: 'user' }
    ]
  },
  { name: 'leaderboard', description: 'Affiche le classement des membres les plus actifs.' },
  {
    name: 'fivestack',
    description: 'Annonce que tu cherches des joueurs pour compléter un 5-stack.',
    options: [
      { name: 'places', description: 'Nombre de places restantes (1 à 4)', required: true, type: 'integer', min: 1, max: 4 },
      { name: 'rang', description: 'Rang recherché (optionnel)', required: false },
      { name: 'note', description: 'Message additionnel (optionnel)', required: false }
    ]
  },
  {
    name: 'kick',
    description: 'Expulse un membre du serveur.',
    defaultPermission: 'KickMembers',
    options: [
      { name: 'membre', description: 'Le membre à expulser', required: true, type: 'user' },
      { name: 'raison', description: 'Raison de l\'expulsion (optionnelle)', required: false }
    ]
  },
  {
    name: 'ban',
    description: 'Bannit un membre du serveur.',
    defaultPermission: 'BanMembers',
    options: [
      { name: 'membre', description: 'Le membre à bannir', required: true, type: 'user' },
      { name: 'raison', description: 'Raison du bannissement (optionnelle)', required: false }
    ]
  },
  {
    name: 'timeout',
    description: 'Mute un membre pendant une durée donnée.',
    defaultPermission: 'ModerateMembers',
    options: [
      { name: 'membre', description: 'Le membre à mute', required: true, type: 'user' },
      { name: 'minutes', description: 'Durée du mute en minutes', required: true, type: 'integer', min: 1, max: 40320 },
      { name: 'raison', description: 'Raison du mute (optionnelle)', required: false }
    ]
  },
  {
    name: 'unmute',
    description: "Retire le mute (timeout) d'un membre.",
    defaultPermission: 'ModerateMembers',
    options: [
      { name: 'membre', description: 'Le membre à démute', required: true, type: 'user' }
    ]
  },
  {
    name: 'warn',
    description: 'Avertit un membre (message dans le salon + DM si possible).',
    defaultPermission: 'ModerateMembers',
    options: [
      { name: 'membre', description: 'Le membre à avertir', required: true, type: 'user' },
      { name: 'raison', description: "Raison de l'avertissement", required: true }
    ]
  },
  {
    name: 'clear',
    description: 'Supprime les derniers messages du salon.',
    defaultPermission: 'ManageMessages',
    options: [
      { name: 'nombre', description: 'Nombre de messages à supprimer (1 à 100)', required: true, type: 'integer', min: 1, max: 100 }
    ]
  },
  { name: 'help', description: 'Affiche la liste des commandes disponibles.' }
];
