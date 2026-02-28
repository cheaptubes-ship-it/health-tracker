import * as xlsx from 'xlsx'

export type ParsedTemplate = {
  dayLabels: Partial<Record<1 | 2 | 3 | 4 | 5, string>>
  slots: Array<{
    dayIndex: 1 | 2 | 3 | 4 | 5
    slotIndex: number
    slotKey: string
    slotLabel: string
    defaultSets: number | null
  }>
}

function normKey(s: unknown) {
  return String(s ?? '')
    .replace(/\[Exercise\].*/i, '')
    .trim()
}

export function parseTrainingTemplateXlsx(buf: Buffer, sheetName: string): ParsedTemplate {
  const wb = xlsx.read(buf, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[sheetName]
  if (!ws) {
    throw new Error(`Sheet not found: ${sheetName}. Available: ${wb.SheetNames.join(', ')}`)
  }

  const rows: any[][] = xlsx.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  })

  let currentDay: number | null = null
  const dayLabels: any = {}
  const slots: ParsedTemplate['slots'] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? []
    const colB = r[1]
    const colC = r[2]
    const slotLabel = r[1]
    const slotKeyRaw = r[3]

    const dayMatch = typeof colC === 'string' && colC.match(/Day\s*(\d+)/i)
    if (dayMatch) {
      currentDay = Number(dayMatch[1])
      const label = typeof colB === 'string' ? colB.trim() : null
      if (currentDay >= 1 && currentDay <= 5 && label) dayLabels[currentDay] = label
      continue
    }

    if (!currentDay || currentDay < 1 || currentDay > 5) continue

    if (typeof slotKeyRaw === 'string' && slotKeyRaw.toLowerCase().includes('[exercise]')) {
      const slotKey = normKey(slotKeyRaw)
      const sets = Number(r[8]) // Week 1 sets column
      const defaultSets = Number.isFinite(sets) && sets > 0 ? sets : null
      const slotIndex = slots.filter((s) => s.dayIndex === currentDay).length + 1
      slots.push({
        dayIndex: currentDay as any,
        slotIndex,
        slotKey,
        slotLabel: String(slotLabel ?? '').trim() || slotKey,
        defaultSets,
      })
    }
  }

  if (!slots.length) {
    throw new Error('No slots found in sheet (expected rows containing "[Exercise]")')
  }

  return { dayLabels, slots }
}
