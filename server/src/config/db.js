import { promises as dns, setDefaultResultOrder, setServers } from 'node:dns';
import mongoose from 'mongoose';

setDefaultResultOrder('ipv4first');

const PUBLIC_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];

function mongodbHostname(uri) {
  try {
    const normalized = uri.replace(/^mongodb(\+srv)?:\/\//i, 'https://');
    return new URL(normalized).hostname;
  } catch {
    return '';
  }
}

async function ensureAtlasSrvLookup(uri) {
  if (!uri.startsWith('mongodb+srv://')) return;

  const hostname = mongodbHostname(uri);
  const srvName = hostname ? `_mongodb._tcp.${hostname}` : '';

  try {
    if (srvName) await dns.resolveSrv(srvName);
  } catch (error) {
    console.warn(
      `MongoDB SRV lookup via system DNS failed (${error.code || error.message}); retrying with public DNS`,
    );
    setServers(PUBLIC_DNS_SERVERS);
    if (srvName) await dns.resolveSrv(srvName);
  }
}

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await ensureAtlasSrvLookup(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 20000,
  });
  console.info('MongoDB connected');
}
