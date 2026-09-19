# Les Cacahuètes Bot

Bot Discord de départ construit avec [discord.js](https://discord.js.org/).

## Prérequis

- Node.js 18.17 ou plus récent
- Une application créée sur le [Discord Developer Portal](https://discord.com/developers/applications)

## Installation

```bash
npm install
```

Copie `.env.example` vers `.env`, puis renseigne :

- `DISCORD_TOKEN` : le token du bot, depuis l'onglet **Bot**
- `DISCORD_CLIENT_ID` : l'Application ID, depuis **General Information**
- `DISCORD_GUILD_ID` : l'identifiant du serveur de test
- `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` : les identifiants d'une application Twitch
- `TWITCH_USERNAME` : le nom de la chaîne à surveiller, par défaut `Lucanemone`
- `DISCORD_STREAM_CHANNEL_ID` : l'identifiant du salon Discord pour les alertes

Ne partage jamais le contenu de `.env` et ne publie jamais le token.

## Inviter le bot

Dans **OAuth2 > URL Generator**, sélectionne les scopes `bot` et `applications.commands`, puis la permission `Send Messages`. Ouvre l'URL générée et ajoute le bot à ton serveur.

Dans **Bot > Privileged Gateway Intents**, active **Server Members Intent** pour que le bot puisse détecter les nouveaux membres.

## Alertes Twitch

Crée une application dans la [Twitch Developer Console](https://dev.twitch.tv/console/apps), avec `http://localhost` comme URL de redirection. Copie son **Client ID** et son **Client Secret** dans `.env`. Le bot vérifie la chaîne toutes les 60 secondes et publie une alerte lorsqu'un nouveau live commence.

## Lancer

Déploie les commandes slash sur ton serveur de test :

```bash
npm run deploy
```

Puis démarre le bot :

```bash
npm start
```

Dans Discord, utilise `/ping` ou `/hello`. Quand un membre rejoint le serveur, le bot envoie `Bienvenue miaou @user` dans le salon `général` ou `general`.
