const fs = require('fs');

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);
const start = 6330;
const end = 6475;

for (let i = start; i <= end && i <= lines.length; i++) {
  console.log(String(i).padStart(5, ' ') + ': ' + lines[i - 1]);
}
