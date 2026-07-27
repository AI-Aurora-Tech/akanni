const fs = require('fs');
let code = fs.readFileSync('src/components/KanbanCard.tsx', 'utf8');

// Update Props
code = code.replace(
  'onDelete: (orderId: string) => void;',
  'onDelete: (orderId: string) => void;\n  onOpenNfeModal?: (order: any) => void;'
);
code = code.replace(
  'export const KanbanCard: React.FC<KanbanCardProps> = ({ order, onStatusChange, onIssueNfe, onEdit, onDelete, nfeInfo }) => {',
  'export const KanbanCard: React.FC<KanbanCardProps> = ({ order, onStatusChange, onIssueNfe, onEdit, onDelete, nfeInfo, onOpenNfeModal }) => {'
);

const newBadgeLogic = `
            {nfeInfo ? (
              <div className="flex space-x-1 items-center" onClick={(e) => { e.stopPropagation(); if (onOpenNfeModal) onOpenNfeModal(order); }}>
                {nfeInfo.status === 'processando' && (
                  <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter cursor-pointer hover:bg-yellow-200">NF-e Proc...</span>
                )}
                {nfeInfo.status === 'autorizada' && (
                  <div className="flex space-x-1 cursor-pointer">
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter hover:bg-green-200">NF-e Autorizada</span>
                  </div>
                )}
                {nfeInfo.status === 'erro' && (
                  <div className="flex space-x-1 cursor-pointer">
                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter hover:bg-red-200" title={nfeInfo.mensagem_erro || 'Erro'}>NF-e ERRO</span>
                  </div>
                )}
              </div>
            ) : (
              isNfeRequired && !order.nfeIssued && (
                <button
                  onClick={(e) => {
                     e.stopPropagation();
                     if (onOpenNfeModal) onOpenNfeModal(order);
                  }}
                  className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Emitir NF-e
                </button>
              )
            )}
`;

code = code.replace(
  /\{nfeInfo \? \([\s\S]*?Emitir NF-e\s*<\/button>\s*\)\s*\)\}/,
  newBadgeLogic.trim()
);

fs.writeFileSync('src/components/KanbanCard.tsx', code);
