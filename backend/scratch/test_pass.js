const bcrypt = require('bcryptjs');
const hash = '$2b$10$UFT8Sij2i3/B91eEh46PA.NTHgmrgD6l32S.4lCfsLQVZvMaexi52';
const password = 'admin123';

bcrypt.compare(password, hash).then(result => {
  console.log('Match:', result);
});
