const fs = require('fs');
let code = fs.readFileSync('src/components/ClientManagement.tsx', 'utf8');

const badgeHtml = `
                  <div className="flex items-center text-xs font-mono text-zinc-400 tracking-wider">
                    <FileText size={12} className="mr-1" />
                    {client.taxId || 'SEM CNPJ/CPF'}
                    <span className="ml-3 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase bg-zinc-100 text-zinc-600">
                      {client.source === 'Data Crazy' ? 'Data Crazy' : 'Manual'}
                    </span>
                  </div>
`;

code = code.replace(
  /<div className="flex items-center text-xs font-mono text-zinc-400 tracking-wider">\s*<FileText size=\{12\} className="mr-1" \/>\s*\{client\.taxId \|\| 'SEM CNPJ\/CPF'\}\s*<\/div>/,
  badgeHtml
);

fs.writeFileSync('src/components/ClientManagement.tsx', code);
