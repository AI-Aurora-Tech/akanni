const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { NfeModal }')) {
  code = code.replace(
    'import { KanbanCard } from \'./components/KanbanCard\';',
    'import { KanbanCard } from \'./components/KanbanCard\';\nimport { NfeModal } from \'./components/NfeModal\';'
  );
}

// Add state if not present (it should be present from previous step)
// const [nfeOrder, setNfeOrder] = useState<Order | null>(null);

const nfeEmitFunc = `
  const handleConfirmEmitNfe = async (orderId: string) => {
    try {
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (!response.ok) {
        throw new Error('Falha ao solicitar emissão. Tente novamente.');
      }
      alert('Emissão solicitada com sucesso! Acompanhe o status.');
      fetchNotasFiscais();
    } catch (err: any) {
      throw err;
    }
  };
`;

if (!code.includes('const handleConfirmEmitNfe')) {
  code = code.replace(
    'const handleDeleteOrder',
    nfeEmitFunc + '\n  const handleDeleteOrder'
  );
}

if (code.includes('onDelete={handleDeleteOrder}')) {
  code = code.replace(
    /onDelete=\{handleDeleteOrder\}\n\s*nfeInfo=\{notasFiscais\[order\.id\]\}/g,
    'onDelete={handleDeleteOrder}\n                                  nfeInfo={notasFiscais[order.id]}\n                                  onOpenNfeModal={(o) => setNfeOrder(o)}'
  );
}

const nfeModalRender = `
        <AnimatePresence>
          {nfeOrder && (
            <NfeModal
              order={nfeOrder}
              nfeInfo={notasFiscais[nfeOrder.id]}
              onClose={() => setNfeOrder(null)}
              onConfirmEmit={handleConfirmEmitNfe}
              onReemit={handleConfirmEmitNfe}
            />
          )}
        </AnimatePresence>
`;

if (!code.includes('<NfeModal')) {
  code = code.replace(
    '</AnimatePresence>\n    </div>',
    '</AnimatePresence>\n' + nfeModalRender + '\n    </div>'
  );
}

fs.writeFileSync('src/App.tsx', code);
