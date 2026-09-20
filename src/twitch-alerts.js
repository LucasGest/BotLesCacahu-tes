const TWITCH_API_URL = 'https://api.twitch.tv/helix';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const POLL_INTERVAL_MS = 60_000;

async function getAppAccessToken(clientId, clientSecret) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    body: params
  });
  if (!response.ok) {
    throw new Error(`Twitch token error (${response.status})`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getStream(clientId, accessToken, username) {
  const response = await fetch(
    `${TWITCH_API_URL}/streams?user_login=${encodeURIComponent(username)}`,
    {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const error = new Error(`Twitch stream error (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.data[0] || null;
}

function startTwitchWatcher(client) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const username = process.env.TWITCH_USERNAME || 'Lucanemone';
  const channelId = process.env.DISCORD_STREAM_CHANNEL_ID || '1539942114660450374';

  if (!clientId || !clientSecret) {
    console.warn('Alertes Twitch désactivées : TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET sont requis.');
    return;
  }

  let accessToken;
  let announcedStreamId;

  const checkStream = async () => {
    try {
      if (!accessToken) {
        accessToken = await getAppAccessToken(clientId, clientSecret);
      }

      const stream = await getStream(clientId, accessToken, username);
      if (!stream) {
        announcedStreamId = undefined;
        return;
      }

      if (stream.id === announcedStreamId) {
        return;
      }

      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.warn(`Le salon Discord ${channelId} est introuvable ou n'accepte pas les messages.`);
        return;
      }

      await channel.send(
        `🔴 **${stream.user_name} est en live sur Twitch !**\n${stream.title}\nhttps://twitch.tv/${stream.user_login}`
      );
      announcedStreamId = stream.id;
    } catch (error) {
      if (error.status === 401) {
        // Token expiré ou révoqué : on le jette pour en redemander un neuf au
        // prochain cycle, sinon chaque vérification échouerait indéfiniment.
        accessToken = undefined;
      }

      console.error(`Erreur pendant la vérification du live Twitch : ${error.message}`);
    }
  };

  checkStream();
  setInterval(checkStream, POLL_INTERVAL_MS);
  console.log(`Surveillance Twitch activée pour ${username}.`);
}

module.exports = { startTwitchWatcher };