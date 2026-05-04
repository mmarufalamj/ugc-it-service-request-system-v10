const fs = require('fs');

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);
const ranges = [
  [2576, 2615],
  [2826, 2865],
  [3053, 3095],
  [5496, 5535],
  [9528, 9568],
];

for (const [start, end] of ranges) {
  console.log(`--- ${start}-${end} ---`);
  for (let i = start; i <= end && i <= lines.length; i++) {
    console.log(String(i).padStart(5, ' ') + ': ' + lines[i - 1]);
  }
}
