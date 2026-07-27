const fs = require('fs');
let code = fs.readFileSync('src/components/KanbanCard.tsx', 'utf8');

// Update Props
code = code.replace(
  'onDelete: (orderId: string) => void;',
  'onDelete: (orderId: string) => void;\n  nfeInfo?: any;'
);
code = code.replace(
  'export const KanbanCard: React.FC<KanbanCardProps> = ({ order, onStatusChange, onIssueNfe, onEdit, onDelete }) => {',
  'export const KanbanCard: React.FC<KanbanCardProps> = ({ order, onStatusChange, onIssueNfe, onEdit, onDelete, nfeInfo }) => {'
);

// We need an import for links if not present, but we can just use <a> tags.
// Add NFe badges near the "isNfeRequired" section
const badgeLogic = `
            {nfeInfo ? (
              <div className="flex space-x-1 items-center">
                {nfeInfo.status === 'processando' && (
                  <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter">NF-e Proc...</span>
                )}
                {nfeInfo.status === 'autorizada' && (
                  <div className="flex space-x-1">
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter">NF-e Autorizada</span>
                    {nfeInfo.url_danfe && (
                      <a href={nfeInfo.url_danfe} target="_blank" rel="noreferrer" className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg text-[10px] hover:bg-zinc-200 uppercase font-bold">DANFE</a>
                    )}
                    {nfeInfo.url_xml && (
                      <a href={nfeInfo.url_xml} target="_blank" rel="noreferrer" className="bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg text-[10px] hover:bg-zinc-200 uppercase font-bold">XML</a>
                    )}
                  </div>
                )}
                {nfeInfo.status === 'erro' && (
                  <div className="flex space-x-1">
                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter" title={nfeInfo.mensagem_erro || 'Erro'}>NF-e ERRO</span>
                    <button onClick={() => {
                        fetch('/api/nfe/emit', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ orderId: order.id })
                        }).then(() => alert('Reenviado para emissão. Atualize em alguns instantes.'));
                    }} className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter hover:bg-blue-700 transition-colors shadow-sm">
                      Reemitir
                    </button>
                  </div>
                )}
              </div>
            ) : (
              isNfeRequired && !order.nfeIssued && (
                <button
                  onClick={() => {
                     fetch('/api/nfe/emit', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ orderId: order.id })
                        }).then(() => alert('Enviado para emissão. Atualize em alguns instantes.'));
                  }}
                  className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Emitir NF-e
                </button>
              )
            )}
`;

code = code.replace(
  /\{isNfeRequired && !order.nfeIssued && \(\s*<button\s*onClick=\{[^}]*\}\s*className="bg-blue-600[^>]*>\s*NF-e\s*<\/button>\s*\)\}/s,
  badgeLogic
);

fs.writeFileSync('src/components/KanbanCard.tsx', code);
