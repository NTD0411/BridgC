import 'dotenv/config';
import { emitKeypressEvents } from 'node:readline';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';

function readHiddenPassword() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
      reject(new Error('Run this command in an interactive terminal'));
      return;
    }

    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write('New admin password (input hidden): ');
    let password = '';

    function cleanup() {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    function onKeypress(character, key = {}) {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.stdout.write('\n');
        reject(new Error('Password reset cancelled'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        process.stdout.write('\n');
        resolve(password);
        return;
      }
      if (key.name === 'backspace') {
        password = password.slice(0, -1);
        return;
      }
      if (character && !key.ctrl && !key.meta) password += character;
    }

    process.stdin.on('keypress', onKeypress);
  });
}

async function resetAdminPassword() {
  const password = await readHiddenPassword();
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Password must contain at least 12 characters and be no more than 72 bytes');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

  await connectDatabase();
  const user = await User.findOne({ email: 'admin@bridgc.com', role: 'admin' }).select('+password');
  if (!user) throw new Error('Admin account admin@bridgc.com was not found');

  user.password = password;
  await user.save();
  console.info('Password updated for admin@bridgc.com');
}

resetAdminPassword()
  .catch((error) => {
    console.error('Could not reset admin password:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
