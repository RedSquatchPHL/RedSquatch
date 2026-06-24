const express = require('express');
const dgram = require('dgram');
const router = express.Router();

const RCON_HOST = 'minecraft-bedrock';
const RCON_PORT = 19132;

// Middleware: Require authentication
router.use((req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Helper to send Minecraft Bedrock RCON command via UDP
const executeRconCommand = (command) => {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const timeout = setTimeout(() => {
      client.close();
      reject(new Error('RCON command timed out'));
    }, 3000);

    try {
      // Minecraft Bedrock RCON format: 4-byte BE int (packet ID) + 1-byte request type + null-terminated string
      const buf = Buffer.alloc(10 + command.length);
      let offset = 0;

      // Packet ID (random)
      buf.writeUInt32BE(Math.floor(Math.random() * 0x7fffffff), offset);
      offset += 4;

      // Request type: 2 = command
      buf.writeUInt8(2, offset);
      offset += 1;

      // Command string (null-terminated)
      buf.write(command, offset, command.length, 'utf8');
      offset += command.length;
      buf.writeUInt8(0, offset); // null terminator

      client.send(buf, 0, buf.length, RCON_PORT, RCON_HOST, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.close();
          reject(err);
        } else {
          // Wait for response
          const responseTimeout = setTimeout(() => {
            client.close();
            clearTimeout(timeout);
            resolve('Command sent'); // Default response if no reply
          }, 500);

          client.once('message', (msg) => {
            clearTimeout(responseTimeout);
            clearTimeout(timeout);
            client.close();
            resolve(msg.toString('utf8').slice(6)); // Skip header, return message
          });
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      client.close();
      reject(error);
    }
  });
};

// Execute raw command
router.post('/execute', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required' });
    const result = await executeRconCommand(command);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get online players
router.get('/players', async (req, res) => {
  try {
    const result = await executeRconCommand('list');
    res.json({ success: true, players: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Give item to player
router.post('/give-item', async (req, res) => {
  try {
    const { player, item, amount } = req.body;
    if (!player || !item) return res.status(400).json({ error: 'Player and item are required' });
    const command = `give @a[name="${player}"] ${item} ${amount || 1}`;
    const result = await executeRconCommand(command);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teleport player
router.post('/teleport', async (req, res) => {
  try {
    const { player, x, y, z } = req.body;
    if (!player || x === undefined || y === undefined || z === undefined) {
      return res.status(400).json({ error: 'Player and coordinates are required' });
    }
    const command = `tp @a[name="${player}"] ${x} ${y} ${z}`;
    const result = await executeRconCommand(command);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server
router.post('/restart', async (req, res) => {
  try {
    await executeRconCommand('say Server restarting in 10 seconds...');
    const result = await executeRconCommand('stop');
    res.json({ success: true, message: 'Server restarting' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
