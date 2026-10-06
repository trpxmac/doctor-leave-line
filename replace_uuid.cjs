const fs = require('fs');
let c = fs.readFileSync('server/db.js', 'utf-8');
let i = 1000;
while(c.includes('uuidv4()')) {
  c = c.replace('uuidv4()', `'00000000-0000-0000-0000-${(i++).toString().padStart(12, '0')}'`);
}
fs.writeFileSync('server/db.js', c);
console.log('Done!');
