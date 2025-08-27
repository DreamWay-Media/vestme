#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('Installing Chrome browser for Puppeteer...');

try {
  // Install Chrome browser using Puppeteer
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  console.log('✅ Chrome browser installed successfully!');
} catch (error) {
  console.error('❌ Failed to install Chrome browser:', error.message);
  console.log('\nYou can also try:');
  console.log('1. npm run postinstall');
  console.log('2. npx puppeteer browsers install chrome');
  process.exit(1);
}
