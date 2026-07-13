const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3100;
const SECRET = process.env.BRIDGE_SECRET;

// Finds the bedrock_server process via the PID namespace shared with the
// minecraft-bedrock container (see docker-compose `pid: container:...`).
function findBedrockPid() {
  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const exe = fs.readlinkSync(`/proc/${entry}/exe`);
      if (exe.startsWith('/data/bedrock_server-')) return entry;
    } catch {
      // process exited or not accessible, skip
    }
  }
  return null;
}

// Sends a real console command to the Bedrock server's stdin (no RCON exists
// on Bedrock - this mirrors itzg image's own `send-command` script).
function sendConsoleCommand(command) {
  if (/[\r\n]/.test(command)) {
    throw new Error('Command must not contain newlines');
  }
  const pid = findBedrockPid();
  if (!pid) {
    throw new Error('Minecraft server process not found');
  }
  fs.writeFileSync(`/proc/${pid}/fd/0`, command + '\n');
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/send-command') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }
  if (!SECRET || req.headers['x-bridge-secret'] !== SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 4096) req.destroy();
  });
  req.on('end', () => {
    try {
      const { command } = JSON.parse(body || '{}');
      if (!command || typeof command !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'command is required' }));
      }
      sendConsoleCommand(command);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => console.log(`mc-console-bridge listening on ${PORT}`));
