import fs from 'node:fs'
import path from 'node:path'
import xlsx from 'xlsx'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/extract-template.mjs /path/to/N_F_5_lbs.xlsx')
  process.exit(1)
}

const outDir = process.argv[3] || path.join(process.cwd(), 'tmp', 'template-extract')
fs.mkdirSync(outDir, { recursive: true })

const wb = xlsx.readFile(file, { cellFormula: true, cellHTML: false, cellNF: true, cellText: true })

const meta = {
  file,
  sheetNames: wb.SheetNames,
  extractedAt: new Date().toISOString(),
}
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2))

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName]
  const json = xlsx.utils.sheet_to_json(ws, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  })
  const safe = sheetName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')
  fs.writeFileSync(path.join(outDir, `${safe}.json`), JSON.stringify(json, null, 2))
}

console.log(`Wrote ${wb.SheetNames.length} sheets to ${outDir}`)
