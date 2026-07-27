const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

if (!code.includes('source?: string;')) {
  code = code.replace(
    'addressState?: string;',
    'addressState?: string;\n  source?: string;'
  );
  fs.writeFileSync('src/types.ts', code);
}
