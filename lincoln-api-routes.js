// ============ LINCOLN WORK LOGS ============
// Paste this block inside registerRoutes() in index.js,
// after the SPORTS section and before the HEALTH CHECK.

  // GET /api/lincoln/logs
  // Query params: ?intake_type=work|research  ?status=...  ?from=YYYY-MM-DD  ?to=YYYY-MM-DD
  app.get('/api/lincoln/logs', requireAuth, async (req, res) => {
    const { intake_type, status, from, to } = req.query;
    const params = [];
    const conditions = [];

    if (intake_type && ['work', 'research'].includes(intake_type)) {
      params.push(intake_type);
      conditions.push(`intake_type = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`date <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await db.query(
        `SELECT * FROM lincoln_work_logs ${where} ORDER BY date DESC, created_at DESC`,
        params
      );
      res.json({ logs: result.rows });
    } catch (err) {
      console.error('Lincoln logs fetch error:', err.message);
      res.status(500).json({ error: 'Failed to fetch work logs' });
    }
  });

  // POST /api/lincoln/logs
  app.post('/api/lincoln/logs', requireAuth, async (req, res) => {
    const { date, project, intake_type, hours, notes, status } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const itype = ['work', 'research'].includes(intake_type) ? intake_type : 'work';
    const st    = status || 'pending';

    try {
      const result = await db.query(
        `INSERT INTO lincoln_work_logs (date, project, intake_type, hours, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [date, project || null, itype, hours || null, notes || null, st]
      );
      res.status(201).json({ log: result.rows[0] });
    } catch (err) {
      console.error('Lincoln log create error:', err.message);
      res.status(500).json({ error: 'Failed to create work log' });
    }
  });

  // PUT /api/lincoln/logs/:id
  app.put('/api/lincoln/logs/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { date, project, intake_type, hours, notes, status } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const itype = ['work', 'research'].includes(intake_type) ? intake_type : 'work';

    try {
      const result = await db.query(
        `UPDATE lincoln_work_logs
         SET date = $1, project = $2, intake_type = $3, hours = $4,
             notes = $5, status = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [date, project || null, itype, hours || null, notes || null, status || 'pending', id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Log not found' });
      res.json({ log: result.rows[0] });
    } catch (err) {
      console.error('Lincoln log update error:', err.message);
      res.status(500).json({ error: 'Failed to update work log' });
    }
  });

  // DELETE /api/lincoln/logs/:id
  app.delete('/api/lincoln/logs/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query(
        'DELETE FROM lincoln_work_logs WHERE id = $1 RETURNING id',
        [id]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Log not found' });
      res.json({ deleted: result.rows[0].id });
    } catch (err) {
      console.error('Lincoln log delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete work log' });
    }
  });
