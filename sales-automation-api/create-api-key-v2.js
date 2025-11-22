import { Sequelize } from 'sequelize';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';

const sequelize = new Sequelize('rtgs_sales_automation', 'rtgs_user', 'rtgs_password_dev', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

async function createApiKey() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Generate API key in prefix.secret format
    const prefixBytes = randomBytes(8);  // 8 bytes = 16 hex chars
    const secretBytes = randomBytes(32);

    const prefix = `sk_live_v2_${prefixBytes.toString('hex')}`;  // Visible prefix (max 32 chars)
    const secret = secretBytes.toString('hex');  // Secret part
    const fullKey = `${prefix}.${secret}`;  // Combined format: prefix.secret

    // Hash only the SECRET part (not the full key)
    const keyHash = await argon2.hash(secret);

    // Insert into database
    const [result] = await sequelize.query(`
      INSERT INTO api_keys (id, prefix, key_hash, name, version, status, scopes, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        :prefix,
        :keyHash,
        'Desktop App Key v2',
        2,
        'active',
        '["read:*", "write:*", "admin:*"]'::json,
        NOW(),
        NOW()
      )
      RETURNING id, prefix;
    `, {
      replacements: { prefix, keyHash }
    });

    console.log('\n🔑 API Key Created Successfully!\n');
    console.log('Full Key (SAVE THIS - shown only once):');
    console.log(fullKey);
    console.log('\nPrefix:', prefix);
    console.log('Secret:', secret);
    console.log('ID:', result[0].id);
    console.log('\nFormat: prefix.secret');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createApiKey();
