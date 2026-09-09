const fs = require('fs');

let content = fs.readFileSync('src/public/index.html', 'utf8');

// Update custom-modal-box
content = content.replace(
    /(\.custom-modal-box\s*\{[\s\S]*?)(\})/g,
    (match, p1) => {
        if (!p1.includes('border-radius: 12px;')) {
            return p1 + '\tborder-radius: 12px;\n}';
        }
        return match;
    }
);

// We need to be careful not to match all closing braces. 
// A safer way is string replace or precise regex.
