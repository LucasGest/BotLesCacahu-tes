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
    adminOnly: true
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
  { name: 'help', description: 'Affiche la liste des commandes disponibles.' }
];
