const bcrypt = require('bcryptjs');
const hash = '$2b$10$bzUS7dDsgtEHL.xUFm1J0.DBeRQOd2Vf4/qL9lCV.lBx1D1pp0sHq';
const password = 'admin123';

bcrypt.compare(password, hash).then(result => {
  console.log('Bob Match:', result);
});
