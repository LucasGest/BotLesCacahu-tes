const { Events } = require('discord.js');
const { startBirthdayScheduler } = require('../utils/birthdayScheduler');
const { startClipOfTheWeekScheduler } = require('../utils/clipOfTheWeek');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Connecté en tant que ${client.user.tag}`);
    startBirthdayScheduler(client);
    startClipOfTheWeekScheduler(client);
  }
};
