const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const saltHex = salt.toString('hex');

  const hash = crypto.createHash('sha256');
  hash.update(password + saltHex);
  const hashHex = hash.digest('hex');

  return `sha256:${saltHex}:${hashHex}`;
}

const hash = hashPassword('admin123');
console.log('Hash:', hash);

const sql = `INSERT OR IGNORE INTO users (dni, nombre, apellido, password_hash, role) VALUES ('00000000', 'Administrador', 'Sistema', '${hash}', 'admin');`;
console.log('SQL:', sql);

require('fs').writeFileSync('admin.sql', sql);
