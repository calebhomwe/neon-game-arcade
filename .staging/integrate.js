const fs = require('fs');
const path = require('path');

const HOST = path.join(__dirname, '..', 'games-arcade.html');
const ORDER = ['CSS','CARD','SCREEN','RAFVAR','ROUTER_CANCEL','ROUTER_BRANCH','JS'];

function parseModule(text, file) {
  const positions = [];
  for (const key of ORDER) {
    const marker = '===' + key + '===';
    const idx = text.indexOf(marker);
    if (idx === -1) throw new Error(file + ': missing delimiter ' + marker);
    positions.push({ key, idx, end: idx + marker.length });
  }
  positions.sort((a,b) => a.idx - b.idx);
  const sections = {};
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].end;
    const stop = (i + 1 < positions.length) ? positions[i+1].idx : text.length;
    sections[positions[i].key] = text.slice(start, stop).trim();
  }
  return sections;
}

function integrate(name) {
  const file = path.join(__dirname, 'game-' + name + '.txt');
  const s = parseModule(fs.readFileSync(file, 'utf8'), file);
  let html = fs.readFileSync(HOST, 'utf8');
  const before = html.length;

  const reps = [
    ['/* NEW-CSS-HERE */',        s.CSS + '\n        /* NEW-CSS-HERE */'],
    ['<!-- NEW-GAMES-HERE -->',   s.CARD + '\n                <!-- NEW-GAMES-HERE -->'],
    ['<!-- NEW-SCREENS-HERE -->', s.SCREEN + '\n    <!-- NEW-SCREENS-HERE -->'],
    ['// NEW-RAF-HERE',           'let ' + name + 'RAF = null;\n    // NEW-RAF-HERE'],
    ['// NEW-CANCEL-HERE',        'if (' + name + 'RAF) { cancelAnimationFrame(' + name + 'RAF); ' + name + 'RAF = null; }\n        // NEW-CANCEL-HERE'],
    ['// NEW-BRANCH-HERE',        '} else if (name === \'' + name + '\') {\n            if (typeof ' + name + 'Init === \'function\') ' + name + 'Init();\n        // NEW-BRANCH-HERE'],
    ['// NEW-JS-HERE',            s.JS + '\n    // NEW-JS-HERE'],
  ];
  for (const [sentinel, insertion] of reps) {
    if (!html.includes(sentinel)) throw new Error(name + ': sentinel not found in host: ' + sentinel);
    html = html.replace(sentinel, insertion);
  }

  // Parse-check the entire combined <script> before committing.
  const a = html.indexOf('<script>') + 8;
  const b = html.indexOf('</script>', a);
  try { new Function(html.slice(a, b)); }
  catch (e) { throw new Error(name + ': combined script failed to parse -> ' + e.message); }

  fs.writeFileSync(HOST, html);
  console.log('integrated ' + name + '  (+' + (html.length - before) + ' chars)');
}

const names = process.argv.slice(2);
if (!names.length) { console.error('usage: node integrate.js <game> [<game> ...]'); process.exit(1); }
for (const n of names) integrate(n);
console.log('ALL OK');
