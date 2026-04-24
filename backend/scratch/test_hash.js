const bcrypt = require('bcryptjs');

async function test() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('New Hash:', hash);
  const match = await bcrypt.compare(password, hash);
  console.log('Match with itself:', match);
}

test();
