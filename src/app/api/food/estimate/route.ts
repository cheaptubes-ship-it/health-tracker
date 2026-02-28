import OpenAI, { toFile } from 'openai'
import { NextResponse } from 'next/server'
import { MacroEstimateSchema } from '@/lib/food/estimate'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// naive per-instance throttle (helps avoid accidental double-submits)
const lastCallByIp = new Map<string, number>()

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Missing OPENAI_API_KEY' },
      { status: 500 }
    )
  }

  // Basic throttle: 1 request / 20s per IP (best-effort; serverless instances may vary)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const nowMs = Date.now()
  const prev = lastCallByIp.get(ip) ?? 0
  if (nowMs - prev < 20_000) {
    const retryAfter = Math.ceil((20_000 - (nowMs - prev)) / 1000)
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Try again shortly.', retryAfterSeconds: retryAfter },
      { status: 429, headers: { 'retry-after': String(retryAfter) } }
    )
  }
  lastCallByIp.set(ip, nowMs)

  const form = await req.formData()
  const file = form.get('image')
  const portion_mode = String(form.get('portion_mode') ?? 'standard').trim()

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Expected form-data field "image"' },
      { status: 400 }
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const mime = file.type && file.type.includes('/') ? file.type : 'image/jpeg'

  // OpenAI vision currently supports common raster formats; HEIC/HEIF is a frequent iPhone format.
  // We don't have an image conversion pipeline here yet, so fail fast with a helpful message.
  if (/image\/(heic|heif)/i.test(mime)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'unsupported_image_format',
        message: 'That image looks like HEIC/HEIF (common on iPhone). Please convert/share as JPG or PNG and try again.',
      },
      { status: 400 }
    )
  }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  if (!allowed.has(mime)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'unsupported_image_format',
        message: `Unsupported image type: ${mime}. Please use JPG, PNG, WebP, or GIF.`,
      },
      { status: 400 }
    )
  }

  const client = new OpenAI({ apiKey })

  // Upload the image and reference it by file_id to avoid data-url parsing issues.
  let fileId: string | null = null
  try {
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : 'jpg'
    const up = await client.files.create({
      file: await toFile(bytes, `meal.${ext}`, { type: mime }),
      purpose: 'vision',
    })
    fileId = up.id
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('food.estimate file upload failed', { msg })
    const status = /rate\s*limit|too\s*many/i.test(msg) ? 429 : 502
    return NextResponse.json({ ok: false, error: msg }, { status })
  }

  // Vision prompt: estimate macros; allow user to edit later.
  const portionNote =
    portion_mode === 'heavy'
      ? 'Portioning: assume HEAVY restaurant portions (extra cheese/oil/sauce unless clearly absent).'
      : portion_mode === 'conservative'
        ? 'Portioning: be conservative; avoid overcounting unless clearly large.'
        : 'Portioning: assume STANDARD restaurant/deli portions unless there is clear evidence it is small/half/mini. Do not undercount.'

  const prompt =
    'You are a nutrition assistant. From the image, infer the food item(s) and estimate total macros for ONE serving shown. ' +
    'If the image contains packaging or a nutrition label, prioritize reading it. ' +
    portionNote + ' ' +
    'Identification: do not confidently claim a specific protein (turkey vs chicken salad) unless it is clearly visible; otherwise say it is unclear and lower confidence. ' +
    'Return ONLY a JSON object (no markdown) with keys: name, calories, protein_g, carbs_g, fat_g, confidence (0-1), notes. ' +
    'Use numbers for macros. Put assumptions (portion sizes, ingredients, oils/cheese amounts) and uncertainty in notes.'

  let resp
  try {
    resp = await client.responses.create({
      model: process.env.AI_FOOD_PHOTO_MODEL || 'gpt-4.1-mini',
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
    const msg = e instanceof Error ? e.message : String(e)
    console.error('food.estimate model call failed', { msg })
    const status = /rate\s*limit|too\s*many/i.test(msg) ? 429 : 502
    return NextResponse.json(
      {
        ok: false,
        error: /rate\s*limit|too\s*many/i.test(msg) ? 'rate_limited' : msg,
        message: /rate\s*limit|too\s*many/i.test(msg)
          ? 'API rate limit reached. Please wait a bit and try again.'
          : msg,
      },
      { status }
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

  // Best-effort usage tracking (no prompts stored)
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('ai_usage_events').insert({
        user_id: user.id,
        kind: 'food_photo_estimate',
        model: process.env.AI_FOOD_PHOTO_MODEL || 'gpt-4.1-mini',
      })
    }
  } catch {
    // ignore
  }

  // Log usage (best-effort)
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('ai_usage_events').insert({
        user_id: user.id,
        kind: 'food_photo_estimate',
        model: process.env.AI_FOOD_PHOTO_MODEL || 'gpt-4.1-mini',
      })
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, estimate: result.data })
}
