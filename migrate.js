const db = require("./db");
const bcrypt = require("bcryptjs");

async function migrate() {
  try {
    console.log("🚀 Starting database migration...");

    // 1. Create unified `users` table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
        phone VARCHAR(20),
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ users table ready");

    // 2. Seed admin user (idempotent)
    const [existingAdmin] = await db.query(
      "SELECT id FROM users WHERE email = ? AND role = 'admin'",
      ["ibrahimshahbaz101@gmail.com"]
    );
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("Admin@1234", 10);
      await db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
        ["Admin", "ibrahimshahbaz101@gmail.com", hashedPassword]
      );
      console.log("✅ Admin user seeded (email: ibrahimshahbaz101@gmail.com, password: Admin@1234)");
    } else {
      console.log("ℹ️  Admin user already exists, skipping seed");
    }

    // 3. Add created_by to Customer (idempotent)
    try {
      await db.query(`
        ALTER TABLE Customer 
        ADD COLUMN created_by INT NULL,
        ADD CONSTRAINT fk_customer_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log("✅ created_by added to Customer");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME" || e.message.includes("Duplicate column")) {
        console.log("ℹ️  Customer.created_by already exists");
      } else { throw e; }
    }

    // 4. Add created_by to Account (idempotent)
    try {
      await db.query(`
        ALTER TABLE Account 
        ADD COLUMN created_by INT NULL,
        ADD CONSTRAINT fk_account_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log("✅ created_by added to Account");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME" || e.message.includes("Duplicate column")) {
        console.log("ℹ️  Account.created_by already exists");
      } else { throw e; }
    }

    // 5. Add created_by to Transaction (idempotent)
    try {
      await db.query(`
        ALTER TABLE Transaction 
        ADD COLUMN created_by INT NULL,
        ADD CONSTRAINT fk_transaction_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log("✅ created_by added to Transaction");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME" || e.message.includes("Duplicate column")) {
        console.log("ℹ️  Transaction.created_by already exists");
      } else { throw e; }
    }

    // 6. Upgrade AuditLog table columns (idempotent)
    const auditCols = ["performed_by", "action", "record_id", "details"];
    for (const col of auditCols) {
      try {
        if (col === "performed_by") {
          await db.query(`ALTER TABLE AuditLog ADD COLUMN performed_by INT NULL`);
        } else if (col === "action") {
          await db.query(`ALTER TABLE AuditLog ADD COLUMN action VARCHAR(100) NULL`);
        } else if (col === "record_id") {
          await db.query(`ALTER TABLE AuditLog ADD COLUMN record_id INT NULL`);
        } else if (col === "details") {
          await db.query(`ALTER TABLE AuditLog ADD COLUMN details TEXT NULL`);
        }
        console.log(`✅ AuditLog.${col} added`);
      } catch (e) {
        if (e.code === "ER_DUP_FIELDNAME" || e.message.includes("Duplicate column")) {
          console.log(`ℹ️  AuditLog.${col} already exists`);
        } else { throw e; }
      }
    }

    // 7. Create system_settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Seed default system settings
    const defaultSettings = [
      ["bank_name", "Aurora Bank"],
      ["default_deposit_limit", "1000000"],
      ["default_withdraw_limit", "500000"],
      ["account_types", "Savings,Current"],
    ];
    for (const [key, value] of defaultSettings) {
      await db.query(
        "INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)",
        [key, value]
      );
    }
    console.log("✅ system_settings table ready");

    console.log("\n🎉 Migration complete! You can now start the server.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
