const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const effectCode = `
  useEffect(() => {
    let mounted = true;
    const channel = supabase.channel('orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (mounted) fetchOrders();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);
`;

// It seems there are existing channels. I'll just add a setInterval for NF-e polling
const newEffect = `
  useEffect(() => {
    // Polling NF-e a cada 30 segundos
    const nfeInterval = setInterval(() => {
      fetchNotasFiscais();
    }, 30000);
    return () => clearInterval(nfeInterval);
  }, []);
`;

if (!code.includes('setInterval(() => {') && !code.includes('fetchNotasFiscais();\n    }, 30000)')) {
  code = code.replace(
    '  useEffect(() => {\n    fetchOrders();',
    newEffect + '\n  useEffect(() => {\n    fetchOrders();'
  );
  fs.writeFileSync('src/App.tsx', code);
}
