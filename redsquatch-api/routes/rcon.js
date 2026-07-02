const express = require('express');
const dgram = require('dgram');

const RCON_HOST = 'minecraft-bedrock';
const RCON_PORT = 19132;

function makeRouter(db) {
  const router = express.Router();

  // Middleware: Require authentication and attach db
  router.use((req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.db = db;
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

// ============ WORLD MANAGEMENT ============

// Validate seed format (Minecraft seeds are alphanumeric, optional minus sign, up to 20 chars)
const validateSeed = (seed) => {
  if (!seed) return true; // Allow empty seed (random)
  return /^-?\d+$/.test(seed) || /^[a-zA-Z0-9_\-]{1,50}$/.test(seed);
};

// Get all 3 world slots
router.get('/worlds', async (req, res) => {
  try {
    if (!req.db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const result = await req.db.query(
      'SELECT id, slot, world_name, seed, last_backup_date, size_mb FROM minecraft_worlds ORDER BY CASE slot WHEN \'active\' THEN 0 WHEN \'inactive_1\' THEN 1 ELSE 2 END'
    );
    res.json({ success: true, worlds: result.rows });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new world in a slot
router.post('/worlds/create', async (req, res) => {
  try {
    const { slot, world_name, seed } = req.body;

    if (!slot || !['active', 'inactive_1', 'inactive_2'].includes(slot)) {
      return res.status(400).json({ error: 'Invalid slot (active, inactive_1, or inactive_2)' });
    }
    if (!world_name) {
      return res.status(400).json({ error: 'World name is required' });
    }
    if (seed && !validateSeed(seed)) {
      return res.status(400).json({ error: 'Invalid seed format (alphanumeric, -, or numeric only)' });
    }

    if (!req.db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Create world via RCON
    const seedParam = seed ? ` seed=${seed}` : '';
    const createCmd = `/new world ${world_name}${seedParam}`;

    try {
      await sendRconCommand(createCmd);
    } catch (rconErr) {
      console.warn('RCON create world warning:', rconErr.message);
      // Continue anyway - world might be created despite RCON error
    }

    // Update database
    const result = await req.db.query(
      'UPDATE minecraft_worlds SET world_name = $1, seed = $2, updated_at = NOW() WHERE slot = $3 RETURNING *',
      [world_name, seed || null, slot]
    );

    res.json({
      success: true,
      message: `World '${world_name}' created in slot ${slot}`,
      world: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating world:', error);
    res.status(500).json({ error: error.message });
  }
});

// Switch between worlds (with backup/restore)
router.post('/worlds/switch', async (req, res) => {
  try {
    const { from_slot, to_slot } = req.body;

    if (!from_slot || !to_slot || from_slot === to_slot) {
      return res.status(400).json({ error: 'Valid from_slot and to_slot required' });
    }
    if (!['active', 'inactive_1', 'inactive_2'].includes(from_slot) ||
        !['active', 'inactive_1', 'inactive_2'].includes(to_slot)) {
      return res.status(400).json({ error: 'Invalid slot names' });
    }

    if (!req.db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const fs = require('fs');

    // Get current world info
    const fromResult = await req.db.query(
      'SELECT * FROM minecraft_worlds WHERE slot = $1',
      [from_slot]
    );
    const fromWorld = fromResult.rows[0];

    if (!fromWorld) {
      return res.status(404).json({ error: 'Source world not found' });
    }

    // Get target world info
    const toResult = await req.db.query(
      'SELECT * FROM minecraft_worlds WHERE slot = $1',
      [to_slot]
    );
    const toWorld = toResult.rows[0];

    if (!toWorld) {
      return res.status(404).json({ error: 'Target world not found' });
    }

    if (!toWorld.world_name) {
      return res.status(400).json({ error: 'Target world is empty. Create a world first.' });
    }

    let backupFile = null;

    try {
      // Step 1: Announce and backup current world (if it exists)
      if (fromWorld.world_name) {
        await sendRconCommand(`say Backing up ${fromWorld.world_name}...`);

        const backupDir = '/home/RedSquatch/minecraft-backups';
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        try {
          const backupScript = '/home/RedSquatch/minecraft-backup.sh';
          const { stdout } = await execPromise(
            `${backupScript} /data/worlds "${backupDir}" "${from_slot}"`
          );
          backupFile = stdout.trim();
          console.log('Backup completed:', backupFile);

          // Update backup timestamp in DB
          await req.db.query(
            'UPDATE minecraft_worlds SET last_backup_date = NOW() WHERE slot = $1',
            [from_slot]
          );
        } catch (backupErr) {
          console.error('Backup error:', backupErr.message);
          // Don't fail the switch if backup fails, just warn
          await sendRconCommand('say Warning: Backup may have failed, but proceeding with world switch');
        }
      }

      // Step 2: Announce world load
      await sendRconCommand(`say Loading ${toWorld.world_name}...`);

      // Step 3: Unload current world (if one exists)
      if (fromWorld.world_name) {
        try {
          await sendRconCommand(`/unload`);
        } catch (e) {
          console.warn('Unload command warning:', e.message);
        }
      }

      // Step 4: Load target world
      try {
        const loadCmd = `/load world "${toWorld.world_name}"`;
        await sendRconCommand(loadCmd);
      } catch (e) {
        console.warn('Load command may have succeeded despite error:', e.message);
      }

      // Step 5: Announce success
      await sendRconCommand(`say World loaded: ${toWorld.world_name}`);

      // Step 6: Update database
      await req.db.query(
        'UPDATE minecraft_worlds SET updated_at = NOW() WHERE slot IN ($1, $2)',
        [from_slot, to_slot]
      );

      res.json({
        success: true,
        message: `Switched from ${from_slot} to ${to_slot}`,
        backup_file: backupFile,
        active_world: toWorld
      });
    } catch (error) {
      throw new Error(`World switch failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error switching worlds:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all backups
router.get('/worlds/backups', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const backupDir = '/home/RedSquatch/minecraft-backups';

    try {
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(f => f.startsWith('world-') && f.endsWith('.tar.gz'))
        .map(f => ({
          filename: f,
          slot: f.split('-')[1] || 'unknown',
          timestamp: f.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || 'unknown'
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({ success: true, backups });
    } catch (err) {
      res.json({ success: true, backups: [] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  return router;
}

module.exports = { makeRouter };
