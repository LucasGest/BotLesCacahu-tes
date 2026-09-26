const { Events } = require('discord.js');

const WELCOME_CHANNEL_ID = '1553346771344826468';

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      console.warn(`Salon de bienvenue ${WELCOME_CHANNEL_ID} introuvable ou non textuel.`);
      return;
    }

    await channel.send(`Bienvenue ${member} sur le serveur ! 🎉`);
  }
};
