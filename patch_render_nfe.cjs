const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

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
    '</DashboardLayout>',
    nfeModalRender + '\n    </DashboardLayout>'
  );
  fs.writeFileSync('src/App.tsx', code);
}
