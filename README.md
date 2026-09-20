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
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` : identifiants Firebase pour le système de niveaux/XP (optionnel, voir plus bas)

Ne partage jamais le contenu de `.env` et ne publie jamais le token.

## Inviter le bot

Dans **OAuth2 > URL Generator**, sélectionne les scopes `bot` et `applications.commands`, puis la permission `Send Messages`. Ouvre l'URL générée et ajoute le bot à ton serveur.

Dans **Bot > Privileged Gateway Intents**, active **Server Members Intent** pour que le bot puisse détecter les nouveaux membres.

## Alertes Twitch

Crée une application dans la [Twitch Developer Console](https://dev.twitch.tv/console/apps), avec `http://localhost` comme URL de redirection. Copie son **Client ID** et son **Client Secret** dans `.env`. Le bot vérifie la chaîne toutes les 60 secondes et publie une alerte lorsqu'un nouveau live commence.

## Système de tickets de recrutement

Le bot gère un système de candidatures Valorant par tickets :

1. Un admin lance `/ticket-setup` dans le salon d'annonce du recrutement (ex: `#recrutement`). Ça poste un message avec un bouton **🎫 Ouvrir un ticket**.
2. Un joueur clique dessus, remplit un formulaire (pseudo Valorant, rang, rôle(s) joué(s), disponibilités).
3. Un salon privé `ticket-<pseudo>` est créé sous la catégorie **🎫 Tickets**, visible seulement par le candidat et le staff (rôles ci-dessous). L'embed de candidature y est posté avec deux boutons, réservés au staff :
   - **🙋 Prise en charge** : marque le ticket comme suivi par un recruteur.
   - **🔒 Fermer le ticket** : sauvegarde l'historique du salon (fichier texte) dans le salon d'archives, puis supprime le salon.

Le staff autorisé et le salon d'archives sont actuellement codés en dur dans [src/index.js](src/index.js) plutôt que dans `.env` :

- `TICKET_STAFF_ROLE_NAMES` : les rôles Discord ayant accès aux tickets (comparés par nom, insensible aux accents/majuscules).
- `TICKET_CATEGORY_NAME` : la catégorie où sont créés les salons de tickets (créée automatiquement si absente).
- `TICKET_ARCHIVE_CHANNEL_ID` : l'ID du salon où sont envoyés les transcripts des tickets fermés.

Modifie ces constantes directement dans le code si tes noms de rôles ou ton salon d'archives changent.

## Anti-spam

Si un membre poste le même message 4 fois ou plus en moins de 10 secondes, le bot supprime les doublons et le mute 60 secondes. État gardé en mémoire (pas de configuration nécessaire), voir `SPAM_WINDOW_MS`, `SPAM_THRESHOLD` et `SPAM_TIMEOUT_MS` dans [src/index.js](src/index.js) pour ajuster les seuils.

## Système de niveaux/XP

Chaque message (hors cooldown d'une minute par membre) rapporte entre 15 et 25 XP, stockées dans Firestore. Un message de félicitations est posté en cas de changement de niveau. `/rank` affiche le niveau d'un membre, `/leaderboard` le classement des 10 plus actifs.

Pour l'activer :

1. Crée un projet sur la [console Firebase](https://console.firebase.google.com/) (gratuit).
2. Active **Firestore Database** (mode production, les règles de sécurité n'ont pas d'importance ici : le bot y accède via un compte de service, pas depuis le navigateur).
3. **Paramètres du projet > Comptes de service > Générer une nouvelle clé privée** : télécharge le fichier JSON.
4. Dans ce fichier, reporte `project_id`, `client_email` et `private_key` dans `.env` (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) et dans les variables d'environnement de Render. La clé privée contient des `\n` littéraux dans le JSON : colle-la telle quelle, sans la reformater.

Sans ces variables, le système de niveaux reste désactivé (log d'avertissement au démarrage) mais le reste du bot fonctionne normalement.

## Commandes disponibles

| Commande | Description |
| --- | --- |
| `/ping` | Répond avec la latence du bot. |
| `/hello` | Le bot te salue. |
| `/help` | Affiche la liste des commandes disponibles. |
| `/partycode` | Partage un code de groupe Valorant via un formulaire. |
| `/ticket-setup` | Poste le message d'ouverture de ticket de recrutement (staff uniquement). |
| `/poll` | Crée un sondage rapide avec jusqu'à 5 options. |
| `/rank` | Affiche ton niveau et ton XP, ou ceux d'un autre membre. |
| `/leaderboard` | Affiche le classement des membres les plus actifs. |

La liste ci-dessus est aussi maintenue dans [src/commands.js](src/commands.js), utilisé à la fois pour déployer les commandes et pour `/help`.

## Lancer

Déploie les commandes slash sur ton serveur de test :

```bash
npm run deploy
```

Puis démarre le bot :

```bash
npm start
```

Quand un membre rejoint le serveur, le bot envoie `Bienvenue miaou @user` dans le salon `général` ou `general`. Il réagit aussi aux messages contenant "chat", et modère (timeout 30s) les messages qui mentionnent quelqu'un d'autre que l'auteur.
