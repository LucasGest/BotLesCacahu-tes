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
  { name: 'help', description: 'Affiche la liste des commandes disponibles.' }
];
