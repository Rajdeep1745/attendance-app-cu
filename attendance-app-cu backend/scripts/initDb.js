require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function initDb() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  try {
    await client.connect();

    console.log("Connected to PostgreSQL.");

    await client.query(sql);

    console.log("Database schema initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed.");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDb();
