const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require('discord.js');

// Liste de secours si l'API Valorant ne répond pas
const AGENTS_SECOURS = [
  { name: 'Astra', role: 'Contrôleur' }, { name: 'Breach', role: 'Initiateur' },
  { name: 'Brimstone', role: 'Contrôleur' }, { name: 'Chamber', role: 'Sentinelle' },
  { name: 'Clove', role: 'Contrôleur' }, { name: 'Cypher', role: 'Sentinelle' },
  { name: 'Deadlock', role: 'Sentinelle' }, { name: 'Fade', role: 'Initiateur' },
  { name: 'Gekko', role: 'Initiateur' }, { name: 'Harbor', role: 'Contrôleur' },
  { name: 'Iso', role: 'Duelliste' }, { name: 'Jett', role: 'Duelliste' },
  { name: 'KAY/O', role: 'Initiateur' }, { name: 'Killjoy', role: 'Sentinelle' },
  { name: 'Neon', role: 'Duelliste' }, { name: 'Omen', role: 'Contrôleur' },
  { name: 'Phoenix', role: 'Duelliste' }, { name: 'Raze', role: 'Duelliste' },
  { name: 'Reyna', role: 'Duelliste' }, { name: 'Sage', role: 'Sentinelle' },
  { name: 'Skye', role: 'Initiateur' }, { name: 'Sova', role: 'Initiateur' },
  { name: 'Tejo', role: 'Initiateur' }, { name: 'Viper', role: 'Contrôleur' },
  { name: 'Vyse', role: 'Sentinelle' }, { name: 'Yoru', role: 'Duelliste' },
];

const EMOJI_ROLE = {
  Duelliste: '⚔️',
  Initiateur: '🔍',
  Contrôleur: '🌫️',
  Sentinelle: '🛡️',
};

const PHRASES = [
  'Pas le choix, tu le joues. 😈',
  'Le destin a parlé. 🎲',
  'Bonne chance à tes mates… 🥜',
  'Aucune excuse si tu perds. 😏',
  'Cacabot a décidé, point final. 🤖',
];

// ---- Récupération des agents depuis valorant-api.com (mise en cache 12 h) ----
const API_URL = 'https://valorant-api.com/v1/agents?language=fr-FR&isPlayableCharacter=true';
const DUREE_CACHE = 12 * 60 * 60 * 1000;
let cache = { agents: null, date: 0 };

async function chargerAgents() {
  if (cache.agents && Date.now() - cache.date < DUREE_CACHE) return cache.agents;

  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();

    const agents = data.map((a) => ({
      name: a.displayName,
      role: a.role?.displayName ?? 'Inconnu',
      roleIcon: a.role?.displayIcon ?? null,
      description: a.description,
      icon: a.displayIcon,
      portrait: a.fullPortrait ?? a.bustPortrait ?? a.displayIcon,
      couleur: a.backgroundGradientColors?.[0]
        ? parseInt(a.backgroundGradientColors[0].slice(0, 6), 16)
        : 0xff4655,
      capacites: (a.abilities ?? [])
        .filter((c) => c.slot !== 'Passive' && c.displayName)
        .map((c) => c.displayName),
    }));

    cache = { agents, date: Date.now() };
    return agents;
  } catch (err) {
    console.error('[agent-random] API Valorant indisponible :', err.message);
    return cache.agents ?? AGENTS_SECOURS.map((a) => ({ ...a, couleur: 0xff4655, capacites: [] }));
  }
}

function tirer(liste, exclu) {
  const choix = liste.length > 1 ? liste.filter((a) => a.name !== exclu) : liste;
  return choix[Math.floor(Math.random() * choix.length)];
}

function creerEmbed(agent, user) {
  const emoji = EMOJI_ROLE[agent.role] ?? '🎯';
  const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];

  const embed = new EmbedBuilder()
    .setColor(agent.couleur)
    .setAuthor({ name: `${emoji} ${agent.role}`, iconURL: agent.roleIcon ?? undefined })
    .setTitle(`🎲 ${agent.name}`)
    .setDescription(`${user} va jouer **${agent.name}** !\n*${phrase}*`)
    .setFooter({ text: 'Cacabot • Les Cacahuètes 🥜' })
    .setTimestamp();

  if (agent.capacites?.length) {
    embed.addFields({ name: '✨ Capacités', value: agent.capacites.join(' · ') });
  }
  if (agent.icon) embed.setThumbnail(agent.icon);
  if (agent.portrait) embed.setImage(agent.portrait);

  return embed;
}

function creerBoutons(desactive = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('agent-random:relancer')
      .setLabel('Relancer')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(desactive),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('agent-random')
    .setDescription('Tire un agent Valorant au hasard.')
    .addStringOption((opt) =>
      opt
        .setName('role')
        .setDescription('Limiter le tirage à un rôle')
        .addChoices(
          { name: '⚔️ Duelliste', value: 'Duelliste' },
          { name: '🔍 Initiateur', value: 'Initiateur' },
          { name: '🌫️ Contrôleur', value: 'Contrôleur' },
          { name: '🛡️ Sentinelle', value: 'Sentinelle' },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const roleChoisi = interaction.options.getString('role');
    const tous = await chargerAgents();
    const liste = roleChoisi ? tous.filter((a) => a.role === roleChoisi) : tous;

    if (!liste.length) {
      return interaction.editReply('😕 Aucun agent trouvé pour ce rôle.');
    }

    let agent = tirer(liste);
    const message = await interaction.editReply({
      embeds: [creerEmbed(agent, interaction.user)],
      components: [creerBoutons()],
    });

    // Bouton "Relancer" actif 2 minutes, réservé à la personne qui a lancé la commande
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 2 * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: '🥜 Lance ta propre commande `/agent-random` pour tirer ton agent !',
          flags: MessageFlags.Ephemeral,
        });
      }
      agent = tirer(liste, agent.name);
      await i.update({ embeds: [creerEmbed(agent, interaction.user)], components: [creerBoutons()] });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [creerBoutons(true)] }).catch(() => {});
    });
  },
};
