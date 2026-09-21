async function handleGuildMemberAdd(member) {
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
}

module.exports = { handleGuildMemberAdd };
