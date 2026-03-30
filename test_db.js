import pg from 'pg';
const { Client } = pg;

async function test() {
  const client = new Client({
    connectionString: "postgresql://postgres:1@localhost:5432/postgres" // Try connecting to default 'postgres' db
  });
  try {
    await client.connect();
    console.log("SUCCESS: Connected to postgres");
    await client.query('SELECT 1');
    console.log("SUCCESS: Query executed");
    await client.end();
  } catch (err) {
    console.error("FAILURE: Cannot connect to postgres");
    console.error(err.message);
    process.exit(1);
  }
}

test();
