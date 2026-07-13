const express = require('express');
const http = require('http');

const PLAYER_NAME_RE = /^[a-zA-Z0-9_]{1,16}$/;
const ITEM_ID_RE = /^[a-z0-9_]{1,64}$/;

const MC_BRIDGE_URL = process.env.MC_BRIDGE_URL || 'http://mc-console-bridge:3100/send-command';
const MC_BRIDGE_SECRET = process.env.MC_BRIDGE_SECRET || '';

function toFiniteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Sends a real console command to the Bedrock server via the mc-console-bridge
// sidecar (no RCON exists on Bedrock; the bridge writes directly to the
// server's stdin via a PID namespace it shares with minecraft-bedrock, kept
// isolated from this container on purpose - see docker-compose).
function sendConsoleCommand(command) {
  if (/[\r\n]/.test(command)) {
    throw new Error('Command must not contain newlines');
  }
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ command });
    const url = new URL(MC_BRIDGE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Bridge-Secret': MC_BRIDGE_SECRET
      },
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(data); } catch { /* ignore */ }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          reject(new Error(parsed.error || `Console bridge returned ${res.statusCode}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Minecraft console bridge timed out')));
    req.on('error', (err) => reject(new Error(`Minecraft console unavailable: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

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

// Execute raw command
router.post('/execute', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== 'string') return res.status(400).json({ error: 'Command is required' });
    await sendConsoleCommand(command);
    res.json({ success: true, result: 'Command sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Give item to player
router.post('/give-item', async (req, res) => {
  try {
    const { player, item, amount } = req.body;
    if (!player || !item) return res.status(400).json({ error: 'Player and item are required' });
    if (!PLAYER_NAME_RE.test(player)) return res.status(400).json({ error: 'Invalid player name' });
    if (!ITEM_ID_RE.test(item)) return res.status(400).json({ error: 'Invalid item id' });
    const qty = Math.min(64, Math.max(1, parseInt(amount, 10) || 1));
    await sendConsoleCommand(`give @a[name="${player}"] ${item} ${qty}`);
    res.json({ success: true, result: 'Command sent' });
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
    if (!PLAYER_NAME_RE.test(player)) return res.status(400).json({ error: 'Invalid player name' });
    const nx = toFiniteNumber(x), ny = toFiniteNumber(y), nz = toFiniteNumber(z);
    if (nx === null || ny === null || nz === null) return res.status(400).json({ error: 'Invalid coordinates' });
    await sendConsoleCommand(`tp @a[name="${player}"] ${nx} ${ny} ${nz}`);
    res.json({ success: true, result: 'Command sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server
router.post('/restart', async (req, res) => {
  try {
    await sendConsoleCommand('say Server restarting in 10 seconds...');
    await sendConsoleCommand('stop');
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

      // Tell the running server to pick up the change without a restart
      try {
        await sendConsoleCommand('allowlist reload');
      } catch (reloadErr) {
        console.warn('allowlist reload warning:', reloadErr.message);
      }

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

      // Tell the running server to pick up the change without a restart
      try {
        await sendConsoleCommand('allowlist reload');
      } catch (reloadErr) {
        console.warn('allowlist reload warning:', reloadErr.message);
      }

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
