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
  ButtonStyle
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection
} = require('@discordjs/voice');
const playdl = require('play-dl');
const { startTwitchWatcher } = require('./twitch-alerts');

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

// Sans ça, YouTube bloque souvent les requêtes venant d'IPs d'hébergeurs cloud
// (comme Render) avec un message "Sign in to confirm you're not a bot".
// YOUTUBE_COOKIE est optionnelle : sans elle, /play risque de ne pas fonctionner en ligne.
if (process.env.YOUTUBE_COOKIE) {
  playdl.setToken({
    youtube: {
      cookie: process.env.YOUTUBE_COOKIE
    }
  });
} else {
  console.warn(
    "YOUTUBE_COOKIE n'est pas définie : /play risque d'échouer si YouTube bloque les requêtes du serveur."
  );
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates
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

    if (interaction.commandName === 'play') {
      const query = interaction.options.getString('recherche');
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        await interaction.reply({
          content: 'Tu dois être dans un salon vocal pour utiliser cette commande.',
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply();

      try {
        // Si ce n'est pas un lien YouTube direct, on cherche et on prend le premier résultat.
        let url = query;
        if ((await playdl.validate(query)) !== 'yt_video') {
          const results = await playdl.search(query, { limit: 1, source: { youtube: 'video' } });

          if (results.length === 0) {
            await interaction.editReply(`Aucun résultat trouvé pour "${query}" 😿`);
            return;
          }

          url = results[0].url;
        }

        const connection = getVoiceConnection(voiceChannel.guild.id)
          ?? joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
          });

        const info = await playdl.video_info(url);
        const stream = await playdl.stream(url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        const player = createAudioPlayer();

        player.play(resource);
        connection.subscribe(player);

        player.once(AudioPlayerStatus.Idle, () => {
          connection.destroy();
        });

        player.once('error', (error) => {
          console.error(`Erreur du lecteur audio : ${error.message}`);
          connection.destroy();
        });

        await interaction.editReply(`🎵 Lecture de **${info.video_details.title}**`);
      } catch (error) {
        console.error('Erreur complète /play :', error);
        await interaction.editReply("Impossible de lire cette musique, désolé 😿");
      }

      return;
    }

    if (interaction.commandName === 'leave') {
      const connection = getVoiceConnection(interaction.guild.id);

      if (!connection) {
        await interaction.reply({ content: "Je ne suis dans aucun vocal.", ephemeral: true });
        return;
      }

      connection.destroy();
      await interaction.reply('👋 À plus, je quitte le vocal.');
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
      ephemeral: true
    });
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