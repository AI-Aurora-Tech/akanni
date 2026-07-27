const fs = require('fs');
let code = fs.readFileSync('supabase_schema.sql', 'utf8');

if (!code.includes('source TEXT DEFAULT \'manual\'')) {
  code = code.replace(
    'address_state TEXT,',
    'address_state TEXT,\n  source TEXT DEFAULT \'manual\','
  );
  fs.writeFileSync('supabase_schema.sql', code);
}
