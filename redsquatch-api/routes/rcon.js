const express = require('express');
const Rcon = require('bedrock-rcon');
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

// Execute raw command
router.post('/execute', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command is required' });
    const rcon = new Rcon(RCON_HOST, RCON_PORT, RCON_PASSWORD);
    await rcon.connect();
    const result = await rcon.execute(command);
    await rcon.close();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get online players
router.get('/players', async (req, res) => {
  try {
    const rcon = new Rcon(RCON_HOST, RCON_PORT, RCON_PASSWORD);
    await rcon.connect();
    const result = await rcon.execute('list');
    await rcon.close();
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
    const rcon = new Rcon(RCON_HOST, RCON_PORT, RCON_PASSWORD);
    await rcon.connect();
    const result = await rcon.execute(command);
    await rcon.close();
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
    const rcon = new Rcon(RCON_HOST, RCON_PORT, RCON_PASSWORD);
    await rcon.connect();
    const result = await rcon.execute(command);
    await rcon.close();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server
router.post('/restart', async (req, res) => {
  try {
    const rcon = new Rcon(RCON_HOST, RCON_PORT, RCON_PASSWORD);
    await rcon.connect();
    await rcon.execute('say Server restarting in 10 seconds...');
    await rcon.execute('stop');
    await rcon.close();
    res.json({ success: true, message: 'Server restarting' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
