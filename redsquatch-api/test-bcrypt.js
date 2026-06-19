const bcrypt = require('bcrypt');
const hash = '$2b$10$t0de2FTysZAXsaA.9ayJS.tTDC9Dcxooo4sKReNsHIC8rxXaOOOv2';
const password = 'clientPass123';
bcrypt.compare(password, hash).then(match => {
  console.log('Match result:', match);
  process.exit(match ? 0 : 1);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
