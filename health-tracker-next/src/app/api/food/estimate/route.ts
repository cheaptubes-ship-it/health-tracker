import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { MacroEstimateSchema } from '@/lib/food/estimate'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Missing OPENAI_API_KEY' },
      { status: 500 }
    )
  }

  const form = await req.formData()
  const file = form.get('image')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Expected form-data field "image"' },
      { status: 400 }
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const base64 = bytes.toString('base64')
  const dataUrl = `data:${file.type};base64,${base64}`

  const client = new OpenAI({ apiKey })

  // Vision prompt: estimate macros; allow user to edit later.
  const prompt =
    'You are a nutrition assistant. From the image, infer the food item(s) and estimate total macros for ONE serving shown. ' +
    'Return a concise JSON object with: name, calories, protein_g, carbs_g, fat_g, confidence (0-1), notes. ' +
    'If the image is a nutrition label, use it. If it is a plate/photo, estimate reasonably and mention assumptions in notes. '

  const resp = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: dataUrl, detail: 'auto' },
        ],
      },
    ],
  })

  const text = resp.output_text
  // Try to parse JSON from model output
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Fallback: attempt to extract JSON blob
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      parsed = JSON.parse(text.slice(start, end + 1))
    } else {
      return NextResponse.json(
        { ok: false, error: 'Model did not return JSON', raw: text },
        { status: 502 }
      )
    }
  }

  const result = MacroEstimateSchema.safeParse(parsed)
  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid estimate shape', raw: parsed },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, estimate: result.data })
}
