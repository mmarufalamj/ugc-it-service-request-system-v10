const fs = require('fs');

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);
const ranges = [
  [3688, 3745],
  [6348, 6395],
  [7978, 8025],
  [9240, 9560],
];

for (const [start, end] of ranges) {
  console.log(`--- ${start}-${end} ---`);
  for (let i = start; i <= end && i <= lines.length; i++) {
    console.log(String(i).padStart(5, ' ') + ': ' + lines[i - 1]);
  }
}
