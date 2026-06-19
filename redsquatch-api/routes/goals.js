'use strict';

/**
 * Goals route extensions.
 * Core goals CRUD lives in index.js; this module adds the archive endpoint
 * for explicit POST /api/client/goals/:id/archive usage from the frontend.
 */

function makeArchiveHandler(db, requireAuth) {
  return [
    requireAuth,
    async (req, res) => {
      const { id } = req.params;
      try {
        const result = await db.query(
          `UPDATE goals SET status = 'archived', archived_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND archived_at IS NULL RETURNING id`,
          [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
        res.json({ success: true });
      } catch (err) {
        console.error('Goal archive error:', err.message);
        res.status(500).json({ error: 'Failed to archive goal' });
      }
    },
  ];
}

module.exports = { makeArchiveHandler };
