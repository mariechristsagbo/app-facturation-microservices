import { spawn } from 'node:child_process';

const services = [
  ['auth-service', 'services/auth-service/server.js'],
  ['client-service', 'services/client-service/server.js'],
  ['product-service', 'services/product-service/server.js'],
  ['stock-service', 'services/stock-service/server.js'],
  ['order-service', 'services/order-service/server.js'],
  ['invoice-service', 'services/invoice-service/server.js'],
  ['payment-service', 'services/payment-service/server.js'],
  ['cash-register-service', 'services/cash-register-service/server.js'],
  ['warehouse-service', 'services/warehouse-service/server.js']
];

const children = services.map(([name, script]) => {
  const child = spawn(process.execPath, [script], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => printLines(name, data));
  child.stderr.on('data', (data) => printLines(name, data));

  child.on('exit', (code) => {
    console.log(`[${name}] arrêté avec le code ${code}`);
  });

  return child;
});

function printLines(name, data) {
  data
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
    .forEach((line) => console.log(line.startsWith('[') ? line : `[${name}] ${line}`));
}

function stopAll() {
  children.forEach((child) => child.kill('SIGTERM'));
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
