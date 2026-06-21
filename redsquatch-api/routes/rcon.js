const express = require('express');
const dgram = require('dgram');
const router = express.Router();

const RCON_HOST = 'localhost';
const RCON_PORT = 19132;
const RCON_PASSWORD = 'RedSquatchRcon123';

// Middleware: Require authentication
router.use((req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Helper to send RCON command via UDP
const sendRconCommand = (command) => {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    const timeout = setTimeout(() => {
      client.close();
      reject(new Error('RCON command timed out'));
    }, 5000);

    try {
      // Simple RCON message format for Bedrock
      // Format: command as UTF-8 string
      const message = Buffer.from(command);
      client.send(message, RCON_PORT, RCON_HOST, (err) => {
        clearTimeout(timeout);
        if (err) {
          client.close();
          reject(err);
        } else {
          // Listen for response (some servers may respond)
          client.on('message', (msg) => {
            client.close();
            resolve(msg.toString());
          });
          // Close after short delay if no response
          setTimeout(() => {
            client.close();
            resolve('Command sent');
          }, 500);
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
    const result = await sendRconCommand(command);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get online players
router.get('/players', async (req, res) => {
  try {
    const result = await sendRconCommand('list');
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
    const result = await sendRconCommand(command);
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
    const result = await sendRconCommand(command);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server
router.post('/restart', async (req, res) => {
  try {
    await sendRconCommand('say Server restarting in 10 seconds...');
    const result = await sendRconCommand('stop');
    res.json({ success: true, message: 'Server restarting' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get whitelist
router.get('/whitelist', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const allowlistPath = '/data/allowlist.json';

    try {
      const data = await fs.readFile(allowlistPath, 'utf-8');
      const whitelist = JSON.parse(data || '[]');
      res.json({ success: true, whitelist });
    } catch (err) {
      res.json({ success: true, whitelist: [] });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add player to whitelist
router.post('/whitelist/add', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    // Validate username: alphanumeric + underscore, 3-16 chars
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      return res.status(400).json({ success: false, message: 'Invalid username (3-16 chars: letters, numbers, underscore)' });
    }

    const fs = require('fs').promises;
    const allowlistPath = '/data/allowlist.json';

    try {
      const data = await fs.readFile(allowlistPath, 'utf-8');
      const whitelist = JSON.parse(data || '[]');

      // Check if player already whitelisted
      if (whitelist.some(p => p.name.toLowerCase() === username.toLowerCase())) {
        return res.json({ success: false, message: 'Player already whitelisted', whitelist });
      }

      // Add player
      whitelist.push({ name: username, xuid: '' });
      await fs.writeFile(allowlistPath, JSON.stringify(whitelist, null, 2));

      // Restart server
      await sendRconCommand('say Whitelist updated');
      setTimeout(() => sendRconCommand('stop'), 500);

      res.json({ success: true, message: `Added ${username} to whitelist`, whitelist });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove player from whitelist
router.post('/whitelist/remove', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    const fs = require('fs').promises;
    const allowlistPath = '/data/allowlist.json';

    try {
      const data = await fs.readFile(allowlistPath, 'utf-8');
      const whitelist = JSON.parse(data || '[]');

      const filtered = whitelist.filter(p => p.name.toLowerCase() !== username.toLowerCase());

      if (filtered.length === whitelist.length) {
        return res.json({ success: false, message: 'Player not found in whitelist', whitelist });
      }

      await fs.writeFile(allowlistPath, JSON.stringify(filtered, null, 2));

      // Restart server
      await sendRconCommand('say Whitelist updated');
      setTimeout(() => sendRconCommand('stop'), 500);

      res.json({ success: true, message: `Removed ${username} from whitelist`, whitelist: filtered });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
