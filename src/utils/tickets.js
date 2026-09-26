const { ChannelType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const config = require('./../config');

const TICKET_CATEGORY_NAME = '🎫 Tickets';

async function getOrCreateCategory(guild) {
  let category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === TICKET_CATEGORY_NAME
  );

  if (!category) {
    category = await guild.channels.create({ name: TICKET_CATEGORY_NAME, type: ChannelType.GuildCategory });
  }

  return category;
}

// Un ticket/une candidature à la fois par personne : identifié par le topic
// du salon plutôt que par un état stocké à part.
function findExistingTicket(guild, openerId, topicPrefix) {
  return guild.channels.cache.find((channel) => channel.topic === `${topicPrefix}:${openerId}`);
}

async function createTicketChannel(guild, opener, { namePrefix, topicPrefix }) {
  const category = await getOrCreateCategory(guild);

  const safeName = opener.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  const access = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory
  ];

  return guild.channels.create({
    name: `${namePrefix}-${safeName || opener.id}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `${topicPrefix}:${opener.id}`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: opener.id, allow: access },
      { id: guild.members.me.id, allow: access },
      ...config.staffRoleIds.map((roleId) => ({ id: roleId, allow: access }))
    ]
  });
}

async function buildTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = sorted.map((message) => {
    const time = new Date(message.createdTimestamp).toLocaleString('fr-FR');
    const parts = [];

    if (message.content) {
      parts.push(message.content);
    }

    for (const embed of message.embeds) {
      if (embed.title) parts.push(`[${embed.title}]`);
      if (embed.description) parts.push(embed.description);
      for (const field of embed.fields) parts.push(`${field.name}: ${field.value}`);
    }

    return `[${time}] ${message.author.tag}: ${parts.join(' | ') || '(message sans texte)'}`;
  });

  return lines.join('\n') || '(salon vide)';
}

// Envoie le transcript dans le salon de logs (LOG_CHANNEL_ID) puis supprime
// le salon. Ne bloque jamais la suppression si le transcript échoue.
async function closeTicketChannel(channel, closedBy) {
  try {
    const transcript = await buildTranscript(channel);

    if (config.logChannelId) {
      const logChannel = await channel.client.channels.fetch(config.logChannelId).catch(() => null);

      if (logChannel?.isTextBased()) {
        const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `${channel.name}.txt` });
        await logChannel.send({
          content: `📁 Salon **#${channel.name}** fermé par ${closedBy}.`,
          files: [attachment]
        });
      }
    }
  } catch (error) {
    console.error(`Impossible de sauvegarder le transcript de ${channel.name} :`, error.message);
  }

  setTimeout(() => {
    channel.delete().catch((error) => console.error(`Impossible de supprimer ${channel.name} :`, error.message));
  }, 5000);
}

module.exports = { getOrCreateCategory, findExistingTicket, createTicketChannel, closeTicketChannel };
