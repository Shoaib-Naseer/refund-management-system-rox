const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('rox_refund_management.sqlite');

db.serialize(() => {
  db.run("PRAGMA ignore_check_constraints = 1");
  db.run("UPDATE refund_cases SET status = 'refunded' WHERE status = 'completed'");
  db.run("UPDATE refund_requests SET status = 'refunded' WHERE status = 'completed'");
  db.run("PRAGMA ignore_check_constraints = 0");
});

db.close();
