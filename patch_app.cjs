const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add NFe states
if (!code.includes('const [notasFiscais, setNotasFiscais]')) {
  code = code.replace(
    'const [nfeOrder, setNfeOrder] = useState<Order | null>(null);',
    'const [nfeOrder, setNfeOrder] = useState<Order | null>(null);\n  const [notasFiscais, setNotasFiscais] = useState<Record<string, any>>({});'
  );
}

// Add fetchNotasFiscais function
const fetchNotasFiscaisLogic = `
  const fetchNotasFiscais = async () => {
    try {
      const { data, error } = await supabase.from('notas_fiscais').select('*');
      if (!error && data) {
        const nfMap = {};
        data.forEach(nf => {
          nfMap[nf.pedido_id] = nf;
        });
        setNotasFiscais(nfMap);
      }
    } catch (err) {
      console.error("Error fetching NFes:", err);
    }
  };
`;
if (!code.includes('const fetchNotasFiscais = async')) {
  code = code.replace(
    'const fetchClients = async () => {',
    fetchNotasFiscaisLogic + '\n  const fetchClients = async () => {'
  );
}

// Call fetchNotasFiscais in useEffect
if (!code.includes('fetchNotasFiscais();')) {
  code = code.replace(
    'fetchOrders();\n      fetchTemplates();',
    'fetchOrders();\n      fetchTemplates();\n      fetchNotasFiscais();'
  );
}

// Pass nfeInfo to KanbanCard
if (code.includes('onDelete={handleDeleteOrder}')) {
  code = code.replace(
    'onDelete={handleDeleteOrder}',
    'onDelete={handleDeleteOrder}\n                                  nfeInfo={notasFiscais[order.id]}'
  );
}

// Update handleStatusChange to auto-emit
const newHandleStatusChange = `
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ 
        status: newStatus,
        status_started_at: new Date().toISOString()
      }).eq('id', orderId);
      
      if (error) throw error;
      fetchOrders();

      // Automático: emitir NF-e se mudar para 'delivered'
      if (newStatus === 'delivered' && !notasFiscais[orderId]) {
        fetch('/api/nfe/emit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        }).then(() => fetchNotasFiscais()).catch(console.error);
      }

    } catch (err: any) {
      console.error("Error changing status:", err);
      alert("Erro ao mudar status: " + (err.message || "Tente novamente."));
    }
  };
`;
code = code.replace(
  /const handleStatusChange = async[^{]*{\s*try {.*?alert\("Erro ao mudar status: "[^}]*}\s*};\s*/s,
  newHandleStatusChange
);

fs.writeFileSync('src/App.tsx', code);
