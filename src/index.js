require('dotenv').config();

const http = require('http');
const {
  Client,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder
} = require('discord.js');
const { startTwitchWatcher } = require('./twitch-alerts');
const COMMANDS = require('./commands');

// Rôles ayant accès aux salons de tickets, et catégorie où ils sont créés.
// Résolus par nom (pas par ID) pour rester simples à retoucher sans .env.
const TICKET_STAFF_ROLE_NAMES = [
  'Recrutement',
  'Staff de la cacahuète',
  'Grand Patron de la Cacahuète',
  'Co-Patron de la Cacahuète'
];
const TICKET_CATEGORY_NAME = '🎫 Tickets';
const TICKET_ARCHIVE_CHANNEL_ID = '1551289156527988817';

// Comparaison normalisée : les accents peuvent être encodés différemment
// (NFC vs NFD) entre ce fichier et le nom du rôle tel que Discord le
// renvoie, ce qui fait échouer un === strict sans que rien ne le signale.
const normalizeName = (value) => value.normalize('NFC').trim().toLowerCase();

function findStaffRoles(guild) {
  return TICKET_STAFF_ROLE_NAMES
    .map((name) => guild.roles.cache.find((r) => normalizeName(r.name) === normalizeName(name)))
    .filter(Boolean);
}

async function getOrCreateCategory(guild, name) {
  let category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name
  );

  if (!category) {
    category = await guild.channels.create({ name, type: ChannelType.GuildCategory });
  }

  return category;
}

async function getArchiveChannel(guild) {
  return guild.channels.cache.get(TICKET_ARCHIVE_CHANNEL_ID) ?? guild.channels.fetch(TICKET_ARCHIVE_CHANNEL_ID);
}

// Récupère l'historique du salon avant sa suppression et le met en forme en
// texte brut, pour garder une trace des candidatures une fois le ticket fermé.
async function buildTicketTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = sorted.map((message) => {
    const time = new Date(message.createdTimestamp).toLocaleString('fr-FR');
    const parts = [];

    if (message.content) {
      parts.push(message.content);
    }

    for (const embed of message.embeds) {
      if (embed.title) {
        parts.push(`[${embed.title}]`);
      }
      if (embed.description) {
        parts.push(embed.description);
      }
      for (const field of embed.fields) {
        parts.push(`${field.name}: ${field.value}`);
      }
    }

    return `[${time}] ${message.author.tag}: ${parts.join(' | ') || '(message sans texte)'}`;
  });

  return lines.join('\n') || '(salon vide)';
}

// Variables obligatoires : le bot ne démarre pas si l'une d'elles manque,
// plutôt que de planter plus tard avec une erreur obscure.
const REQUIRED_ENV_VARS = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
const missingVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  throw new Error(
    `Variables d'environnement manquantes : ${missingVars.join(', ')}. Vérifie ton fichier .env (jamais commité !).`
  );
}

const token = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Connecte en tant que ${readyClient.user.tag}`);
  startTwitchWatcher(client);
});

client.on(Events.GuildMemberAdd, async (member) => {
  const generalChannel = member.guild.channels.cache.find(
    (channel) =>
      channel.isTextBased() &&
      ['général', 'general'].includes(channel.name.toLowerCase())
  );

  if (!generalChannel) {
    console.warn(`Aucun salon général trouvé sur ${member.guild.name}.`);
    return;
  }

  await generalChannel.send(`Bienvenue miaou ${member}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    return;
  }

  const mentionsSomeoneElse = message.mentions.users.some(
    (user) => user.id !== message.author.id && user.id !== client.user.id
  );

  if (mentionsSomeoneElse) {
    await message.reply('Ferme ton miaw');

    try {
      // moderatable === false si le bot n'a pas la permission ou si le rôle
      // de la cible est plus haut que celui du bot : évite un crash inutile.
      if (message.member?.moderatable) {
        await message.member.timeout(30_000, 'A mentionné quelqu\'un d\'autre');
      }
    } catch (error) {
      console.error(`Impossible de timeout ${message.author.tag} : ${error.message}`);
    }
  }

  if (message.content.toLowerCase().includes('chat')) {
    const chatEmojiNames = [
      'emoji_1', 'emoji_2', 'emoji_3', 'emoji_4',
      'emoji_5', 'emoji_6', 'emoji_7', 'emoji_8',
      'emoji_9', 'emoji_10', 'emoji_11', 'emoji_12',
      'emoji_13', 'emoji_14', 'emoji_15', 'emoji_16'
    ]; // ← mets ici les noms exacts de tes emotes
    const availableEmojis = message.guild?.emojis.cache.filter((e) =>
      chatEmojiNames.includes(e.name.toLowerCase())
    );

    const emoji =
      availableEmojis && availableEmojis.size > 0
        ? availableEmojis.random()
        : '🐱';

    try {
      await message.react(emoji);
    } catch (error) {
      console.error(`Impossible de réagir au message : ${error.message}`);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'ping') {
      await interaction.reply(`Pong ! Latence : ${client.ws.ping} ms`);
      return;
    }

    if (interaction.commandName === 'hello') {
      await interaction.reply(`Salut ${interaction.user} !`);
      return;
    }

    if (interaction.commandName === 'help') {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📖 Commandes disponibles')
        .setDescription(
          COMMANDS.map(({ name, description }) => `**/${name}** — ${description}`).join('\n')
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.commandName === 'ticket-setup') {
      const embed = new EmbedBuilder()
        .setColor(0xff4655)
        .setTitle('🎮 Recrutement Valorant')
        .setDescription(
          "Tu veux rejoindre l'équipe ? Clique sur le bouton ci-dessous pour ouvrir un ticket et candidater."
        );

      const openButton = new ButtonBuilder()
        .setCustomId('open_ticket')
        .setLabel('🎫 Ouvrir un ticket')
        .setStyle(ButtonStyle.Success);

      await interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(openButton)]
      });
      return;
    }

    if (interaction.commandName === 'partycode') {
      const modal = new ModalBuilder()
        .setCustomId('partycode_modal')
        .setTitle('🎮 Partager un code de groupe');

      const codeInput = new TextInputBuilder()
        .setCustomId('partycode_code')
        .setLabel('Code du groupe')
        .setPlaceholder('Ex: ABC123')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(true);

      const modeInput = new TextInputBuilder()
        .setCustomId('partycode_mode')
        .setLabel('Mode de jeu')
        .setPlaceholder('Ex: Compétitif, Non-classé, Deathmatch...')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const slotsInput = new TextInputBuilder()
        .setCustomId('partycode_slots')
        .setLabel('Places disponibles')
        .setPlaceholder('Ex: 2/5')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const noteInput = new TextInputBuilder()
        .setCustomId('partycode_note')
        .setLabel('Message (optionnel)')
        .setPlaceholder('Ex: On monte en rang ce soir, viens tranquille !')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(codeInput),
        new ActionRowBuilder().addComponents(modeInput),
        new ActionRowBuilder().addComponents(slotsInput),
        new ActionRowBuilder().addComponents(noteInput)
      );

      await interaction.showModal(modal);
    }

    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'partycode_modal') {
    const code = interaction.fields.getTextInputValue('partycode_code');
    const mode = interaction.fields.getTextInputValue('partycode_mode');
    const slots = interaction.fields.getTextInputValue('partycode_slots');
    const note = interaction.fields.getTextInputValue('partycode_note');

    const embed = new EmbedBuilder()
      .setColor(0xff4655) // rouge Valorant
      .setTitle('🎮 Nouvelle partie Valorant !')
      .addFields({ name: 'Code du groupe', value: `\`${code}\``, inline: true });

    if (mode) {
      embed.addFields({ name: 'Mode', value: mode, inline: true });
    }

    if (slots) {
      embed.addFields({ name: 'Places', value: slots, inline: true });
    }

    if (note) {
      embed.addFields({ name: 'Message', value: note });
    }

    embed
      .setFooter({
        text: `Partagé par ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    const copyButton = new ButtonBuilder()
      .setCustomId(`copy_partycode_${code}`)
      .setLabel('📋 Copier le code')
      .setStyle(ButtonStyle.Secondary);

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(copyButton)]
    });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('copy_partycode_')) {
    const code = interaction.customId.replace('copy_partycode_', '');

    await interaction.reply({
      content: `\`${code}\``,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.isButton() && interaction.customId === 'open_ticket') {
    const modal = new ModalBuilder()
      .setCustomId('ticket_modal')
      .setTitle('🎮 Candidature recrutement');

    const pseudoInput = new TextInputBuilder()
      .setCustomId('ticket_pseudo')
      .setLabel('Pseudo Valorant (+ tag)')
      .setPlaceholder('Ex: Joueur#EUW1')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const rankInput = new TextInputBuilder()
      .setCustomId('ticket_rank')
      .setLabel('Rang actuel')
      .setPlaceholder('Ex: Diamant 2')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const roleInput = new TextInputBuilder()
      .setCustomId('ticket_role')
      .setLabel('Rôle(s) joué(s)')
      .setPlaceholder('Ex: Duelliste, Initiateur')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const availabilityInput = new TextInputBuilder()
      .setCustomId('ticket_availability')
      .setLabel('Disponibilités')
      .setPlaceholder('Ex: Soirs en semaine, week-ends')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(pseudoInput),
      new ActionRowBuilder().addComponents(rankInput),
      new ActionRowBuilder().addComponents(roleInput),
      new ActionRowBuilder().addComponents(availabilityInput)
    );

    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const pseudo = interaction.fields.getTextInputValue('ticket_pseudo');
      const rank = interaction.fields.getTextInputValue('ticket_rank');
      const role = interaction.fields.getTextInputValue('ticket_role');
      const availability = interaction.fields.getTextInputValue('ticket_availability');

      const { guild } = interaction;

      // Un joueur ne peut avoir qu'un ticket ouvert à la fois : on le retrouve
      // via le topic du salon plutôt que de stocker un état à part.
      const existing = guild.channels.cache.find(
        (channel) => channel.topic === `ticket-opener:${interaction.user.id}`
      );

      if (existing) {
        await interaction.editReply(`Tu as déjà un ticket ouvert : ${existing}`);
        return;
      }

      const staffRoles = findStaffRoles(guild);

      if (staffRoles.length === 0) {
        console.warn(
          `Aucun des rôles staff (${TICKET_STAFF_ROLE_NAMES.join(', ')}) n'a été trouvé sur ${guild.name}.`
        );
      }

      const category = await getOrCreateCategory(guild, TICKET_CATEGORY_NAME);

      const safeName = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

      const ticketAccess = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ];

      const ticketChannel = await guild.channels.create({
        name: `ticket-${safeName || interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `ticket-opener:${interaction.user.id}`,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: ticketAccess },
          { id: client.user.id, allow: ticketAccess },
          ...staffRoles.map((staffRole) => ({ id: staffRole.id, allow: ticketAccess }))
        ]
      });

      const summaryEmbed = new EmbedBuilder()
        .setColor(0xff4655)
        .setTitle('🎮 Nouvelle candidature')
        .addFields(
          { name: 'Candidat', value: `${interaction.user}`, inline: true },
          { name: 'Pseudo Valorant', value: pseudo, inline: true },
          { name: 'Rang', value: rank, inline: true },
          { name: 'Rôle(s) joué(s)', value: role, inline: true }
        )
        .setTimestamp();

      if (availability) {
        summaryEmbed.addFields({ name: 'Disponibilités', value: availability });
      }

      const claimButton = new ButtonBuilder()
        .setCustomId('claim_ticket')
        .setLabel('🙋 Prise en charge')
        .setStyle(ButtonStyle.Primary);

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Fermer le ticket')
        .setStyle(ButtonStyle.Danger);

      const staffMentions = staffRoles.map((staffRole) => `<@&${staffRole.id}>`).join(' ');

      await ticketChannel.send({
        content: `${interaction.user} ${staffMentions}`.trim(),
        embeds: [summaryEmbed],
        components: [new ActionRowBuilder().addComponents(claimButton, closeButton)]
      });

      await interaction.editReply(`Ticket créé : ${ticketChannel}`);
    } catch (error) {
      console.error('Erreur complète /ticket (création) :', error);
      await interaction.editReply("Impossible de créer ton ticket, désolé 😿");
    }

    return;
  }

  if (interaction.isButton() && interaction.customId === 'claim_ticket') {
    const claimedButton = new ButtonBuilder()
      .setCustomId('claim_ticket')
      .setLabel(`Pris en charge par ${interaction.user.username}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true);

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('🔒 Fermer le ticket')
      .setStyle(ButtonStyle.Danger);

    await interaction.update({
      components: [new ActionRowBuilder().addComponents(claimedButton, closeButton)]
    });

    await interaction.followUp(`🙋 Ticket pris en charge par ${interaction.user} !`);
    return;
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await interaction.reply('🔒 Fermeture et sauvegarde du ticket en cours...');

    try {
      const transcript = await buildTicketTranscript(interaction.channel);
      const archiveChannel = await getArchiveChannel(interaction.guild);
      const openerId = interaction.channel.topic?.replace('ticket-opener:', '') ?? null;
      const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), {
        name: `${interaction.channel.name}.txt`
      });

      await archiveChannel.send({
        content:
          `📁 Ticket **#${interaction.channel.name}** fermé par ${interaction.user}` +
          (openerId ? ` (candidat : <@${openerId}>)` : ''),
        files: [attachment]
      });
    } catch (error) {
      console.error('Impossible de sauvegarder le transcript du ticket :', error.message);
    }

    setTimeout(() => {
      interaction.channel.delete().catch((error) => {
        console.error('Impossible de supprimer le salon de ticket :', error.message);
      });
    }, 5000);
  }
});

// Filet de sécurité global : une erreur non gérée quelque part ne doit jamais
// planter tout le process (déni de service facile sinon), juste être logguée.
process.on('unhandledRejection', (error) => {
  console.error('Rejet de promesse non géré :', error);
});

process.on('uncaughtException', (error) => {
  console.error('Exception non gérée :', error);
});

// Serveur HTTP minimal : Render (free tier) exige un port ouvert pour
// considérer le service "actif", et un outil comme UptimeRobot peut pinguer
// cette route toutes les X minutes pour empêcher la mise en veille automatique.
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Les Cacahuètes bot is alive 🥜');
  })
  .listen(PORT, () => {
    console.log(`Serveur keep-alive en écoute sur le port ${PORT}.`);
  });

client.login(token).catch((error) => {
  // On logge le type d'erreur, jamais le token lui-même.
  console.error(`Échec de connexion à Discord : ${error.message}`);
  process.exit(1);
});
