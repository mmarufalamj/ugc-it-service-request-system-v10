const fs = require('fs');

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);
const ranges = [
  [2568, 2610],
  [2818, 2858],
  [3046, 3095],
  [3222, 3268],
  [3708, 3760],
  [5488, 5538],
  [6336, 6398],
  [7984, 8030],
  [9240, 9305],
  [9520, 9565],
];

for (const [start, end] of ranges) {
  console.log(`--- ${start}-${end} ---`);
  for (let i = start; i <= end && i <= lines.length; i++) {
    console.log(String(i).padStart(5, ' ') + ': ' + lines[i - 1]);
  }
}
