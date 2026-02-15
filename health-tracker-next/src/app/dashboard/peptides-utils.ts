export type PeptideCalcInput = {
  vial_amount: number
  vial_unit: 'mg' | 'mcg'
  recon_volume_ml: number
  desired_dose: number
  desired_dose_unit: 'mg' | 'mcg'
}

export function calcPeptide(input: PeptideCalcInput) {
  const vialAmountMcg = input.vial_unit === 'mg' ? input.vial_amount * 1000 : input.vial_amount
  const desiredDoseMcg =
    input.desired_dose_unit === 'mg' ? input.desired_dose * 1000 : input.desired_dose

  const concentration_mcg_per_ml = vialAmountMcg / input.recon_volume_ml
  const volume_needed_ml = desiredDoseMcg / concentration_mcg_per_ml
  const syringe_units = volume_needed_ml * 100 // common insulin syringe: 100 units = 1 mL

  return {
    vialAmountMcg,
    desiredDoseMcg,
    concentration_mcg_per_ml,
    volume_needed_ml,
    syringe_units,
    actual_dose_mcg: desiredDoseMcg,
  }
}

// Normalization for keys/lookup. Used by trends + schedules.
export function peptideKey(name: string) {
  return (
    'pep__' +
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  )
}
