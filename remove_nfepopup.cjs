const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove NfePopup
code = code.replace(/<AnimatePresence>.*?<NfePopup.*?<\/AnimatePresence>/s, '');
code = code.replace(/import \{ NfePopup \} from '\.\/components\/NfePopup';/, '');

fs.writeFileSync('src/App.tsx', code);
