const fs = require('fs');
let code = fs.readFileSync('supabase_schema.sql', 'utf8');

// Fix triggers to drop before create
const triggers = [
  'update_users_updated_at',
  'update_stock_updated_at',
  'update_orders_updated_at',
  'update_clients_updated_at',
  'update_notas_fiscais_updated_at'
];

triggers.forEach(trigger => {
  const createTriggerRegex = new RegExp(`CREATE TRIGGER ${trigger}`, 'g');
  const dropTriggerStmt = `DROP TRIGGER IF EXISTS ${trigger} ON public.${trigger.split('_')[1] === 'notas' ? 'notas_fiscais' : trigger.split('_')[1]};\nCREATE TRIGGER ${trigger}`;
  code = code.replace(createTriggerRegex, dropTriggerStmt);
});

// Also fix the functions to use OR REPLACE
code = code.replace(/CREATE FUNCTION update_updated_at_column/g, 'CREATE OR REPLACE FUNCTION update_updated_at_column');

fs.writeFileSync('supabase_schema.sql', code);
