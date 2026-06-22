import * as fs from 'fs'
import * as path from 'path'

function searchDir(dir: string) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchDir(fullPath)
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.sql')) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        if (content.toLowerCase().includes('finochietti') || content.toLowerCase().includes('afodes18')) {
          console.log(`Found in: ${fullPath}`)
        }
      }
    }
  })
}

searchDir('C:\\Users\\aleja\\.gemini\\antigravity\\scratch\\tubus')
