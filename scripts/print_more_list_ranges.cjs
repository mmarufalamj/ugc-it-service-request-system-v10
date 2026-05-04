const fs = require('fs');

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);
const ranges = [
  [7048, 7255],
  [7698, 7768],
];

for (const [start, end] of ranges) {
  console.log(`--- ${start}-${end} ---`);
  for (let i = start; i <= end && i <= lines.length; i++) {
    console.log(String(i).padStart(5, ' ') + ': ' + lines[i - 1]);
  }
}
