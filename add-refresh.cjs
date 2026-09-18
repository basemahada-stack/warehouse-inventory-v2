const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const processFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if we already modified it
  if (content.includes('useBackgroundRefresh')) return;

  const isSubdir = filePath.includes('transactions') || filePath.includes('settings');
  const importPath = isSubdir ? '../../hooks/useBackgroundRefresh' : '../hooks/useBackgroundRefresh';

  // 1. Add import
  content = content.replace(/(import React.*?;\n)/, `$1import { useBackgroundRefresh } from '${importPath}';\n`);

  // 2. Change fetch function signature
  // Most use fetchData, InventoryPage uses fetchInventory, OutStock uses fetchDependencies
  const fetchNameMatch = content.match(/const (fetchData|fetchInventory|fetchDependencies|loadData) = async \(\) => {/);
  if (fetchNameMatch) {
    const funcName = fetchNameMatch[1];
    
    content = content.replace(new RegExp(`const ${funcName} = async \\(\\) => {`), `const ${funcName} = async (isBackground = false) => {`);
    
    // 3. Skip setLoading
    content = content.replace(/setLoading\(true\);/g, 'if (!isBackground) setLoading(true);');
    content = content.replace(/setLoading\(false\);/g, 'if (!isBackground) setLoading(false);');

    // 4. Add useBackgroundRefresh
    content = content.replace(
      new RegExp(`useEffect\\(\\(\\) => {\\s+${funcName}\\(\\);\\s+}, \\[[^\\]]*\\]\\);`),
      match => `${match}\n\n  useBackgroundRefresh(${funcName});`
    );
    // If they have if (!hasSupabaseConfig) return setLoading(false);
    content = content.replace(/return setLoading\(false\);/g, 'return isBackground ? undefined : setLoading(false);');
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Modified:', filePath);
};

const walkSync = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath);
    } else if (stats.isFile() && filepath.endsWith('.tsx')) {
      processFile(filepath);
    }
  });
};

walkSync(pagesDir);
console.log('Done!');
