const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('source: c.source || \'manual\',')) {
  code = code.replace(
    'addressState: c.address_state || \'\',',
    'addressState: c.address_state || \'\',\n          source: c.source || \'manual\','
  );
  fs.writeFileSync('src/App.tsx', code);
}
