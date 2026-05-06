const fs = require('fs');
let code = fs.readFileSync('src/app/api/vision/generate-all-audio/route.ts', 'utf8');
console.log("length:", code.length);
