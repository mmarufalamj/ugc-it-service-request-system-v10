const fs = require('fs');

const lines = fs.readFileSync('src/App.tsx', 'utf8').split(/\r?\n/);
const terms = ['overflow-x-auto', 'max-h-[520px] overflow-auto', 'max-h-[520px]'];

for (let i = 0; i < lines.length; i++) {
  if (terms.some((term) => lines[i].includes(term))) {
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length - 1, i + 4);
    console.log(`--- line ${i + 1} ---`);
    for (let j = start; j <= end; j++) {
      console.log(String(j + 1).padStart(5, ' ') + ': ' + lines[j]);
    }
  }
}
