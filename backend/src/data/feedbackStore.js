const db = require('../services/db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating INTEGER NOT NULL,
    email TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

exports.insert = (feedback, cb) => {
  const { rating, email, message } = feedback;
  const stmt = db.prepare('INSERT INTO feedback (rating, email, message) VALUES (?, ?, ?)');
  stmt.run([rating, email, message], function(err) {
    if (cb) cb(err, this ? this.lastID : undefined);
  });
  stmt.finalize();
};

exports.getAll = (cb) => {
  db.all('SELECT * FROM feedback ORDER BY created_at DESC', cb);
};
