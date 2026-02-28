import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const ItemSchema = z.object({
  product_name: z.string().optional(),
  brands: z.string().optional(),
  serving_size: z.string().optional(),
  nutriments: z
    .object({
      energy_kcal_100g: z.coerce.number().optional(),
      proteins_100g: z.coerce.number().optional(),
      carbohydrates_100g: z.coerce.number().optional(),
      fat_100g: z.coerce.number().optional(),
      // when OpenFoodFacts provides per-serving values (often strings)
      energy_kcal_serving: z.coerce.number().optional(),
      proteins_serving: z.coerce.number().optional(),
      carbohydrates_serving: z.coerce.number().optional(),
      fat_serving: z.coerce.number().optional(),
    })
    .optional(),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  if (!q) {
    return NextResponse.json({ ok: true, items: [] })
  }

  // OpenFoodFacts: no API key required
  const apiUrl = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  apiUrl.searchParams.set('search_terms', q)
  apiUrl.searchParams.set('search_simple', '1')
  apiUrl.searchParams.set('action', 'process')
  apiUrl.searchParams.set('json', '1')
  apiUrl.searchParams.set(
    'fields',
    'product_name,brands,serving_size,nutriments'
  )
  apiUrl.searchParams.set('page_size', '12')

  const res = await fetch(apiUrl.toString(), {
    headers: {
      'User-Agent': 'health-tracker-next/0.1 (OpenClaw)',
    },
    // keep fresh enough
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `OpenFoodFacts error: ${res.status}` },
      { status: 502 }
    )
  }

  const json = await res.json()
  const products = Array.isArray(json?.products) ? json.products : []

  type Item = z.infer<typeof ItemSchema>
  const parsedProducts: Item[] = []
  for (const p of products) {
    const parsed = ItemSchema.safeParse(p)
    if (parsed.success) parsedProducts.push(parsed.data)
  }

  const items = parsedProducts.map((p) => {
    const name = p.product_name?.trim() || 'Unknown'
    const brand = p.brands?.trim() || null
    const serving = p.serving_size?.trim() || null
    const n = p.nutriments || {}

    const per100g = {
      calories: n.energy_kcal_100g ?? null,
      protein_g: n.proteins_100g ?? null,
      carbs_g: n.carbohydrates_100g ?? null,
      fat_g: n.fat_100g ?? null,
    }

    const perServing = {
      calories: n.energy_kcal_serving ?? null,
      protein_g: n.proteins_serving ?? null,
      carbs_g: n.carbohydrates_serving ?? null,
      fat_g: n.fat_serving ?? null,
    }

    // If calories missing but macros present, estimate calories from macros
    function estimateCals(x: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }) {
      if (x.calories != null) return x
      const p = x.protein_g ?? 0
      const c = x.carbs_g ?? 0
      const f = x.fat_g ?? 0
      const hasAny = (x.protein_g != null) || (x.carbs_g != null) || (x.fat_g != null)
      if (!hasAny) return x
      return { ...x, calories: Math.round(p * 4 + c * 4 + f * 9) }
    }

    const per100g2 = estimateCals(per100g)
    const perServing2 = estimateCals(perServing)

    return {
      name: brand ? `${name} (${brand})` : name,
      serving,
      per100g: per100g2,
      perServing: perServing2,
    }
  })

  return NextResponse.json({ ok: true, items })
}
