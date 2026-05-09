const db = require("./db");
const bcrypt = require("bcryptjs");

async function seedAdmin() {
  try {
    // Check if admin_users exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Only seed the specific user
    const email = "ibrahimshahbaz101@gmail.com";
    const password = "aurorabank08";

    // Delete any existing admins so "no one any other can create account here"
    await db.query("DELETE FROM admin_users");

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query("INSERT INTO admin_users (email, password) VALUES (?, ?)", [email, hashedPassword]);

    console.log("✅ Admin user seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedAdmin();
