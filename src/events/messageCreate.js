const { Events } = require('discord.js');

// Enlève les accents (è -> e) puis matche les variantes courantes :
// cacahuète, cacahuete, cacahouette, cacahouete, cacahuètes... avec ou sans h.
const PEANUT_REGEX = /caca(h)?(?:ou|u)ett?e?s?/;

function mentionsCacahuete(content) {
  const normalized = content.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return PEANUT_REGEX.test(normalized);
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) {
      return;
    }

    if (mentionsCacahuete(message.content)) {
      await message.react('🥜');
    }
  }
};
