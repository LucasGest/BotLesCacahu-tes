// Télécharge le binaire yt-dlp adapté à la plateforme dans bin/.
// yt-dlp est mis à jour très régulièrement pour contourner les blocages
// anti-bot de YouTube, contrairement aux libs Node pures (play-dl, ytdl-core)
// qui cassent dès que YouTube change son système de tokens.
const fs = require('fs');
const path = require('path');
const https = require('https');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// On utilise les binaires autonomes (embarquant leur propre Python) plutôt que
// l'asset "yt-dlp" nu, qui suppose un python3 déjà présent sur le système —
// non garanti sur l'environnement Node de Render.
const assetName = isWindows ? 'yt-dlp.exe' : isMac ? 'yt-dlp_macos' : 'yt-dlp_linux';
const dest = path.join(BIN_DIR, assetName);

function download(url, destination, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'les-cacahuetes-bot' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          if (redirectsLeft === 0) {
            reject(new Error('Trop de redirections lors du téléchargement de yt-dlp.'));
            return;
          }
          resolve(download(res.headers.location, destination, redirectsLeft - 1));
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Échec du téléchargement de yt-dlp : HTTP ${res.statusCode}`));
          return;
        }

        fs.mkdirSync(BIN_DIR, { recursive: true });
        const file = fs.createWriteStream(destination);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

(async () => {
  if (fs.existsSync(dest)) {
    console.log('yt-dlp est déjà présent, téléchargement ignoré.');
    return;
  }

  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;
  console.log(`Téléchargement de yt-dlp (${assetName})...`);
  await download(url, dest);

  if (!isWindows) {
    fs.chmodSync(dest, 0o755);
  }

  console.log('yt-dlp installé dans', dest);
})().catch((error) => {
  console.error('Impossible de télécharger yt-dlp :', error.message);
  process.exit(1);
});
