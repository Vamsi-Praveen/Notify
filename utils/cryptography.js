import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.PUSH_SECRET_KEY, 'hex');
const IV_LENGTH = 16;

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    content: encrypted,
    tag: cipher.getAuthTag().toString('hex'),
  });
}

export function decrypt(hash) {
  const payload = JSON.parse(hash);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(payload.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));

  let decrypted = decipher.update(payload.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
