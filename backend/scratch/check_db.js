const { Pool } = require('pg');

const urls = [
  "postgresql://sowndarkumar:admin@localhost:5432/society_management",
  "postgresql://sowndarkumar:postgres@localhost:5432/society_management",
  "postgresql://sowndarkumar:root@localhost:5432/society_management",
  "postgresql://sowndarkumar:password@localhost:5432/society_management",
  "postgresql://postgres:postgres@localhost:5432/society_management",
  "postgresql://postgres:admin@localhost:5432/society_management",
  "postgresql://postgres:root@localhost:5432/society_management",
  "postgresql://postgres:password@localhost:5432/society_management",
  "postgresql://sowndarkumar:123456@localhost:5432/society_management",
  "postgresql://postgres:123456@localhost:5432/society_management",
  // Also try connecting to default 'postgres' database in case 'society_management' doesn't exist yet
  "postgresql://postgres:postgres@localhost:5432/postgres",
  "postgresql://postgres:admin@localhost:5432/postgres",
  "postgresql://postgres:123456@localhost:5432/postgres"
];

async function testAll() {
  for (const url of urls) {
    const pool = new Pool({ connectionString: url });
    try {
      const res = await pool.query('SELECT NOW()');
      console.log("SUCCESS for:", url);
      pool.end();
      return url;
    } catch (err) {
      console.log("FAILED for:", url, "-", err.message);
    }
    pool.end();
  }
  console.log("All connection attempts failed.");
}

testAll();
