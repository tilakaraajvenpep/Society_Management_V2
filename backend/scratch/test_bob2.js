const bcrypt = require('bcryptjs');
// Hash for bob2@crystal.com from DB (need to fetch it)
const password = 'admin123admin123';

async function check() {
  const hash = await require('child_process').execSync("psql -d society_management -t -c \"SELECT password FROM \\\"User\\\" WHERE email = 'bob2@crystal.com';\"").toString().trim();
  console.log('Hash in DB:', hash);
  const match = await bcrypt.compare(password, hash);
  console.log('Bob2 Match with admin123admin123:', match);
}
check();
