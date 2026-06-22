import * as fs from 'fs'

const pageContent = fs.readFileSync('C:\\Users\\aleja\\Desktop\\..\\.gemini\\antigravity\\scratch\\tubus\\src\\app\\page.tsx', 'utf-8')
const lines = pageContent.split('\n')

lines.forEach((line, idx) => {
  if (line.includes('lineSelectorTab') || line.includes('setLineSelectorTab')) {
    console.log(`${idx + 1}: ${line.trim()}`)
  }
})
