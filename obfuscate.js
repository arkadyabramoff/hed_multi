const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build', 'static', 'js');

fs.readdirSync(buildDir).forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(buildDir, file);
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscated = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      deadCodeInjection: true,
      stringArray: true,
      stringArrayEncoding: ['rc4'],
      stringArrayThreshold: 0.75,
    }).getObfuscatedCode();
    fs.writeFileSync(filePath, obfuscated, 'utf8');
  }
}); 