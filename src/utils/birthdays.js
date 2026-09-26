const fs = require('fs');
const path = require('path');

// Stockage fichier simple : suffisant pour cette fonctionnalité, mais perdu à
// chaque redéploiement sur Render (disque non persistant). À migrer vers une
// vraie base (ex: Firebase) si les anniversaires doivent survivre à ça.
const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'birthdays.json');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function setBirthday(userId, day, month) {
  const data = readAll();
  data[userId] = { day, month, lastAnnouncedYear: data[userId]?.lastAnnouncedYear ?? null };
  writeAll(data);
}

function removeBirthday(userId) {
  const data = readAll();
  delete data[userId];
  writeAll(data);
}

function getAll() {
  return readAll();
}

function markAnnounced(userId, year) {
  const data = readAll();
  if (data[userId]) {
    data[userId].lastAnnouncedYear = year;
    writeAll(data);
  }
}

module.exports = { setBirthday, removeBirthday, getAll, markAnnounced };
