const bcrypt = require('bcrypt');
bcrypt.hash('clientPass123', 10).then(hash => {
  console.log('NEW_HASH:' + hash);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
