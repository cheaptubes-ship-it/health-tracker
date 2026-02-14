export type DeloadMode = 'half_weight' | 'half_weight_half_volume'

export type RepGoal = string // e.g. "3/fail", "2/fail", "1/fail"

export type TemplateSlot = {
  dayIndex: 1 | 2 | 3 | 4 | 5
  slotIndex: number
  slotKey: string // e.g. Incline_Push
  slotLabel: string // e.g. Incline Chest
  defaultSets: number
}

export type TemplateMeso = {
  id: string
  name: string
  days: number
  weeks: number
  deloadWeekIndex: number
  // weekIndex -> repGoal text; week=deload handled separately
  repGoalsByWeek: Record<number, RepGoal>
  slots: TemplateSlot[]
}

// Minimal v1 extracted from the workbook structure.
// We’ll replace these slot definitions by parsing the xlsx precisely.
export const MESO1_BASIC_HYPERTROPHY: TemplateMeso = {
  id: 'meso1_basic_hypertrophy',
  name: 'Mesocycle 1 — Basic Hypertrophy',
  days: 5,
  weeks: 7,
  deloadWeekIndex: 7,
  repGoalsByWeek: {
    1: '3/fail',
    2: '3/fail',
    3: '2/fail',
    4: '2/fail',
    5: '2/fail',
    6: '1/fail',
  },
  // Day order + default sets observed in the sheet.
  slots: [
    // Day 1
    { dayIndex: 1, slotIndex: 1, slotKey: 'Incline_Push', slotLabel: 'Incline Chest', defaultSets: 2 },
    { dayIndex: 1, slotIndex: 2, slotKey: 'Chest_Isolation', slotLabel: 'Chest Isolation', defaultSets: 2 },
    { dayIndex: 1, slotIndex: 3, slotKey: 'Horizontal_Push', slotLabel: 'Horizontal Chest', defaultSets: 2 },
    { dayIndex: 1, slotIndex: 4, slotKey: 'Horizontal_Back', slotLabel: 'Horizontal Pull', defaultSets: 2 },
    { dayIndex: 1, slotIndex: 5, slotKey: 'Rear_or_Side_Delts', slotLabel: 'Rear or Side Delts', defaultSets: 3 },
    { dayIndex: 1, slotIndex: 6, slotKey: 'Abs', slotLabel: 'Abs', defaultSets: 2 },

    // Day 2
    { dayIndex: 2, slotIndex: 1, slotKey: 'Quads', slotLabel: 'Quads', defaultSets: 3 },
    { dayIndex: 2, slotIndex: 2, slotKey: 'Quads', slotLabel: 'Quads (2)', defaultSets: 2 },
    { dayIndex: 2, slotIndex: 3, slotKey: 'Hamstrings_Isolation', slotLabel: 'Hamstrings Isolation', defaultSets: 3 },
    { dayIndex: 2, slotIndex: 4, slotKey: 'Calves', slotLabel: 'Calves', defaultSets: 4 },

    // Day 3
    { dayIndex: 3, slotIndex: 1, slotKey: 'Vertical_Back', slotLabel: 'Vertical Pull', defaultSets: 2 },
    { dayIndex: 3, slotIndex: 2, slotKey: 'Vertical_Back', slotLabel: 'Vertical Pull (2)', defaultSets: 2 },
    { dayIndex: 3, slotIndex: 3, slotKey: 'Horizontal_Back', slotLabel: 'Horizontal Pull', defaultSets: 2 },
    { dayIndex: 3, slotIndex: 4, slotKey: 'Horizontal_Push', slotLabel: 'Horizontal Chest', defaultSets: 2 },
    { dayIndex: 3, slotIndex: 5, slotKey: 'Rear_or_Side_Delts', slotLabel: 'Rear or Side Delts', defaultSets: 3 },
    { dayIndex: 3, slotIndex: 6, slotKey: 'Abs', slotLabel: 'Abs', defaultSets: 2 },

    // Day 4
    { dayIndex: 4, slotIndex: 1, slotKey: 'Glutes', slotLabel: 'Glutes', defaultSets: 3 },
    { dayIndex: 4, slotIndex: 2, slotKey: 'Glutes', slotLabel: 'Glutes (2)', defaultSets: 3 },
    { dayIndex: 4, slotIndex: 3, slotKey: 'Hamstrings_Hip_Hinge', slotLabel: 'Hamstrings Hip Hinge', defaultSets: 3 },
    { dayIndex: 4, slotIndex: 4, slotKey: 'Quads', slotLabel: 'Quads', defaultSets: 3 },
    { dayIndex: 4, slotIndex: 5, slotKey: 'Calves', slotLabel: 'Calves', defaultSets: 4 },

    // Day 5
    { dayIndex: 5, slotIndex: 1, slotKey: 'Biceps', slotLabel: 'Biceps', defaultSets: 3 },
    { dayIndex: 5, slotIndex: 2, slotKey: 'Triceps', slotLabel: 'Triceps', defaultSets: 3 },
    { dayIndex: 5, slotIndex: 3, slotKey: 'Front_Delts', slotLabel: 'Front Delts', defaultSets: 3 },
    { dayIndex: 5, slotIndex: 4, slotKey: 'Traps', slotLabel: 'Traps', defaultSets: 3 },
    { dayIndex: 5, slotIndex: 5, slotKey: 'Vertical_Back', slotLabel: 'Vertical Pull', defaultSets: 2 },
    { dayIndex: 5, slotIndex: 6, slotKey: 'Incline_Push', slotLabel: 'Incline Chest', defaultSets: 2 },
    { dayIndex: 5, slotIndex: 7, slotKey: 'Abs', slotLabel: 'Abs', defaultSets: 2 },
  ],
}
