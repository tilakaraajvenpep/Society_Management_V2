const bcrypt = require('bcryptjs');
const hash = '$2b$10$mg3BLk.XXpc26Dk6yjSneOehry5h9Rps8w9QZLxP2EdMBdFFOFsPq';
const password = 'admin123';

bcrypt.compare(password, hash).then(result => {
  console.log('Super Admin Match:', result);
});
