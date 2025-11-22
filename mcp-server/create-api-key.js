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

    // Generate API key
    const keyBytes = randomBytes(32);
    const fullKey = `sk_live_${keyBytes.toString('hex')}`;
    const prefix = fullKey.substring(0, 32);
    const keyHash = await argon2.hash(fullKey);

    // Insert into database
    const [result] = await sequelize.query(`
      INSERT INTO api_keys (id, prefix, key_hash, name, version, status, scopes, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        :prefix,
        :keyHash,
        'Desktop App Key',
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
    console.log('ID:', result[0].id);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createApiKey();
