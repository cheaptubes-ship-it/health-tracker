import fs from 'node:fs'

const inPath = 'tmp/template-extract/Mesocycle_1_Basic_Hypertrophy.json'
const outPath = 'src/lib/training/meso1-options.ts'

const rows = JSON.parse(fs.readFileSync(inPath, 'utf8'))

/**
 * Header rows look like: ["Abs","Exercise","Link", ...]
 * Following rows look like: ["", "Machine Crunch", "https://...", ...]
 */
const blocks = {}
let i = 0
while (i < rows.length) {
  const r = rows[i]
  if (
    Array.isArray(r) &&
    typeof r[0] === 'string' &&
    String(r[1] ?? '').trim() === 'Exercise' &&
    String(r[2] ?? '').trim() === 'Link'
  ) {
    const group = String(r[0] ?? '').trim()
    const items = []
    i++
    while (i < rows.length) {
      const rr = rows[i]
      if (!Array.isArray(rr)) break
      // next header begins
      if (typeof rr[0] === 'string' && String(rr[1] ?? '').trim() === 'Exercise' && String(rr[2] ?? '').trim() === 'Link') {
        i--
        break
      }
      const name = String(rr[1] ?? '').trim()
      const link = String(rr[2] ?? '').trim()
      if (!name) {
        i++
        continue
      }
      if (!link || !/^https?:\/\//.test(link)) {
        i++
        continue
      }
      items.push({ name, video_url: link })
      i++
    }

    if (group && items.length) blocks[group] = items
  }
  i++
}

// Map template slot keys to the appropriate block(s)
const slotMap = {
  Abs: ['Abs'],
  Calves: ['Calves'],
  Biceps: ['Biceps'],
  Triceps: ['Horizontal Triceps', 'Vertical Triceps'],
  Front_Delts: ['Front Delts'],
  Traps: ['Traps'],
  Vertical_Back: ['Vertical Back'],
  Horizontal_Back: ['Horizonal Back', 'Horizontal Back'],
  Quads: ['Quads'],
  Glutes: ['Glutes'],
  Hamstrings_Hip_Hinge: ['Hamstrings Hip Hinge'],
  Hamstrings_Isolation: ['Hamstrings Isolation'],
  Chest_Isolation: ['Chest Isolation'],
  Horizontal_Push: ['Horizontal Push'],
  Incline_Push: ['Incline Push'],
  Rear_or_Side_Delts: ['Rear Delts', 'Side Delts'],
}

function uniqueByName(list) {
  const seen = new Set()
  const out = []
  for (const it of list) {
    const k = it.name.toLowerCase().trim()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(it)
  }
  return out
}

const out = {}
for (const [slotKey, groups] of Object.entries(slotMap)) {
  const items = []
  for (const g of groups) {
    if (blocks[g]) items.push(...blocks[g])
  }
  out[slotKey] = uniqueByName(items)
}

const file = `// Auto-generated from ${inPath}
// Do not edit by hand. Re-run: node scripts/gen-meso1-options.mjs

export type ExerciseOption = { name: string; video_url: string }

export const MESO1_EXERCISE_OPTIONS: Record<string, ExerciseOption[]> = ${JSON.stringify(out, null, 2)} as const
`

fs.writeFileSync(outPath, file)
console.log(`Wrote ${outPath}`)
