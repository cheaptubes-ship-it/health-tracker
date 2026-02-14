import OpenAI, { toFile } from 'openai'
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
  const mime = file.type && file.type.includes('/') ? file.type : 'image/jpeg'

  const client = new OpenAI({ apiKey })

  // Upload the image and reference it by file_id to avoid data-url parsing issues.
  let fileId: string | null = null
  try {
    const up = await client.files.create({
      file: await toFile(bytes, 'meal.jpg', { type: mime }),
      purpose: 'vision',
    })
    fileId = up.id
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    )
  }

  // Vision prompt: estimate macros; allow user to edit later.
  const prompt =
    'You are a nutrition assistant. From the image, infer the food item(s) and estimate total macros for ONE serving shown. ' +
    'If the image contains packaging or a nutrition label, prioritize reading it. ' +
    'Be conservative: do not confidently claim a specific protein (turkey vs chicken salad) unless it is clearly visible; otherwise say it is unclear and lower confidence. ' +
    'Return ONLY a JSON object (no markdown) with keys: name, calories, protein_g, carbs_g, fat_g, confidence (0-1), notes. ' +
    'Use numbers for macros. Put assumptions and uncertainty in notes.'

  let resp
  try {
    resp = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', file_id: fileId, detail: 'auto' },
          ],
        },
      ],
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    )
  }

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
