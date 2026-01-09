import nodemailer from 'nodemailer';

const transporterCache = new Map();

export const getTransporter = (credentials) => {
  const key = `${credentials.host}:${credentials.user}`;

  if (transporterCache.has(key)) {
    return transporterCache.get(key);
  }

  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port,
    secure: credentials.enableSSL || false,
    pool: true,
    auth: {
      user: credentials.user,
      pass: credentials.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  transporterCache.set(key, transporter);
  return transporter;
};
