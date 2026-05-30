// Express-Server für Electron-Renderer
const express = require('express');
const path = require('path');

function startStaticServer(distPath, port = 3000) {
  const app = express();
app.use(express.static(path.resolve(distPath)));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
  return new Promise(resolve => {
    const server = app.listen(port, () => {
      resolve({ server, port });
    });
  });
}

module.exports = { startStaticServer };
