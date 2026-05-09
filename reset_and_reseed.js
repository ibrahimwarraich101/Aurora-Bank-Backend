const db = require("./db");
const bcrypt = require("bcryptjs");

async function resetAndReseed() {
  try {
    console.log("🧹 Cleaning database...");

    // 1. Disable FK checks temporarily for clean truncation
    await db.query("SET FOREIGN_KEY_CHECKS = 0");

    await db.query("TRUNCATE TABLE AuditLog");
    await db.query("TRUNCATE TABLE Transaction");
    await db.query("TRUNCATE TABLE Account");
    await db.query("TRUNCATE TABLE Customer");
    await db.query("DELETE FROM users");
    await db.query("ALTER TABLE users AUTO_INCREMENT = 1");

    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("✅ All customer, account, transaction and audit data cleared");

    // 2. Add username column if not exists
    try {
      await db.query("ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE NULL");
      console.log("✅ username column added to users");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME" || (e.message && e.message.includes("Duplicate column"))) {
        console.log("ℹ️  username column already exists");
      } else { throw e; }
    }

    // 3. Update role ENUM to include 'guest'
    try {
      await db.query(`ALTER TABLE users MODIFY COLUMN role ENUM('admin','employee','guest') NOT NULL DEFAULT 'employee'`);
      console.log("✅ role ENUM updated to include guest");
    } catch (e) {
      console.log("ℹ️  role ENUM update note:", e.message);
    }

    // 4. Seed Admin user
    const adminHash = await bcrypt.hash("Pithu@208", 10);
    await db.query(
      "INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, 'admin')",
      ["Admin", "Admin", "ibrahimshahbaz101@gmail.com", adminHash]
    );
    console.log("✅ Admin seeded  →  username: Admin | password: Pithu@208");

    // 5. Seed Guest user
    const guestHash = await bcrypt.hash("Guest@1234", 10);
    await db.query(
      "INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, 'guest')",
      ["Guest", "Guest", "guest@aurorabank.com", guestHash]
    );
    console.log("✅ Guest seeded  →  username: Guest | password: Guest@1234");

    console.log("\n🎉 Reset complete! Database is clean and re-seeded.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Reset failed:", err.message);
    process.exit(1);
  }
}

resetAndReseed();
