const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

// Create connection pool with promise support
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export promise wrapper
const db = pool.promise();

// Test connection using promise API
db.getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL database!");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });

// Export both pool and db for flexibility
module.exports = db;
module.exports.pool = pool;