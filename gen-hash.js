// Quick script to generate password hash
const crypto = require('crypto');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const keyMaterial = await new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyMaterial, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const saltHex = salt.toString('hex');
  const ivHex = iv.toString('hex');
  const encHex = Buffer.concat([encrypted, authTag]).toString('hex');

  return `pbkdf2:100000:${saltHex}:${ivHex}:${encHex}`;
}

hashPassword('admin123').then(hash => {
  console.log(hash);
});
