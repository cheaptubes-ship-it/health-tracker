import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const ItemSchema = z.object({
  product_name: z.string().optional(),
  brands: z.string().optional(),
  serving_size: z.string().optional(),
  nutriments: z
    .object({
      energy_kcal_100g: z.number().optional(),
      proteins_100g: z.number().optional(),
      carbohydrates_100g: z.number().optional(),
      fat_100g: z.number().optional(),
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
    const calories = n.energy_kcal_100g ?? null
    const protein_g = n.proteins_100g ?? null
    const carbs_g = n.carbohydrates_100g ?? null
    const fat_g = n.fat_100g ?? null

    return {
      name: brand ? `${name} (${brand})` : name,
      serving,
      per100g: {
        calories,
        protein_g,
        carbs_g,
        fat_g,
      },
    }
  })

  return NextResponse.json({ ok: true, items })
}
