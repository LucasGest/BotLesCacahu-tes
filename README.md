# Les Cacahuètes Bot

Bot Discord de départ construit avec [discord.js](https://discord.js.org/).

## Prérequis

- Node.js 18.17 ou plus récent
- Une application créée sur le [Discord Developer Portal](https://discord.com/developers/applications)

## Installation

```bash
npm install
```

Remplis `.env` à la racine avec :

- `DISCORD_TOKEN` : le token du bot, depuis l'onglet **Bot**
- `DISCORD_CLIENT_ID` : l'Application ID, depuis **General Information**
- `DISCORD_GUILD_ID` : l'identifiant du serveur de test

Ne partage jamais le contenu de `.env` et ne publie jamais le token.

## Inviter le bot

Dans **OAuth2 > URL Generator**, sélectionne les scopes `bot` et `applications.commands`. Ouvre l'URL générée et ajoute le bot à ton serveur.

## Structure

```
src/
  commands/
    general/
      ping.js
  events/
    ready.js
    interactionCreate.js
  config.js
  deploy-commands.js
  index.js
```

Chaque commande est un fichier sous `src/commands/<catégorie>/`, qui exporte :

```js
module.exports = {
  data: new SlashCommandBuilder().setName('...').setDescription('...'),
  async execute(interaction) { ... }
};
```

`index.js` charge automatiquement tous les fichiers de `src/commands/` (peu importe la catégorie) et de `src/events/` — ajouter une commande ou un event ne demande jamais de toucher `index.js`, juste de déposer le fichier au bon endroit.

Chaque event est un fichier sous `src/events/`, qui exporte :

```js
module.exports = {
  name: Events.NomDeLevent,
  once: false, // true pour un event qui ne doit se déclencher qu'une fois (ex: ready)
  execute(...args) { ... }
};
```

## Lancer

Déploie les commandes slash sur ton serveur :

```bash
npm run deploy
```

Puis démarre le bot :

```bash
npm start
```

## Commandes disponibles

| Commande | Description |
| --- | --- |
| `/ping` | Répond avec la latence du bot. |
