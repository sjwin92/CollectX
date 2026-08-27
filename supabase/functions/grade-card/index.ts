import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A limited number of free scans per user, then purchased credits are consumed.
// Kept low since each scan costs the platform a real Claude API call.
const FREE_SCAN_LIMIT = 3;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-5';

// There's no off-the-shelf trained card-grading model we own yet — this uses
// Claude as a "teacher" for now. Every scan's photos + this structured
// response are persisted (see storage upload + DB insert below) specifically
// so they can be used later as a labeled dataset to train our own in-house
// grading model, rather than depending on an LLM call per scan forever.
const GRADING_PROMPT = `You are assessing the physical condition of a trading card from photos, the same way a professional grading company (PSA, BGS/Beckett, CGC, SGC, TAG) would.

Assess these factors independently, each on a 1-10 scale (10 = flawless):
- centering: how well-centered the artwork is within the card border. Also estimate the left/right and top/bottom border ratios (e.g. "55/45").
- corners: sharpness of the four corners — look for whitening, fraying, rounding.
- edges: condition of the card's edges — look for whitening, nicks, roughness.
- surface: the card face — look for scratches, print lines, indentations, glare spots, staining.

If only a front photo is provided, assess surface/corners/edges from the front only and note that in "notes". If a back photo is provided too, weigh it in as well (a real grade considers both sides).

Then give your best estimate of the numeric grade each major company would most likely assign this card overall, all on a 1-10 scale in .5 steps: predicted_psa (whole or .5), predicted_bgs (Beckett), predicted_cgc, predicted_sgc, predicted_tag. Use null for any you genuinely cannot estimate. Remember PSA gives one overall number, BGS/Beckett is typically the lowest subgrade with some leeway, CGC sits between, SGC tends to grade a touch stricter than PSA, and TAG is a computer-vision grade that is usually close to CGC.

Also rate your own confidence in this assessment from 0-100. Be honest and conservative here, not reassuring — collectors specifically distrust AI grading tools that report a single confident-looking number with no sense of uncertainty attached. Lower your confidence for: a front-only submission (no back photo), poor lighting or glare obscuring part of the card, a blurry or low-resolution image, or a borderline case between two grades.

Respond with ONLY a single JSON object, no markdown formatting, no other text, matching exactly this shape:
{"centering": number, "centering_ratio_lr": string, "centering_ratio_tb": string, "corners": number, "edges": number, "surface": number, "predicted_psa": number, "predicted_bgs": number, "predicted_cgc": number, "predicted_sgc": number, "predicted_tag": number, "confidence": number, "notes": string}`;

// Appended when the client sent a geometric centering measurement from the
// on-device scanner — that number is ground truth, not something to re-guess.
function measuredCenteringNote(m: { lr: string; tb: string; grade: number }): string {
  return `\n\nIMPORTANT: Centering has already been measured geometrically from this photo (outer card edge vs. inner border): left/right ${m.lr}, top/bottom ${m.tb}, centering sub-grade ${m.grade}/10. Do NOT re-score centering — echo those exact values in "centering", "centering_ratio_lr", "centering_ratio_tb". Only mention centering in "notes" if the card looks genuinely miscut or off-register in a way the ratios wouldn't capture. Score corners, edges and surface independently as normal.`;
}

// Rough PSA-style condition labels, bucketed off the computed overall grade.
// Not an official standard — a reasonable approximation for a "pre-grade" estimate.
function conditionLabel(grade: number): string {
  if (grade >= 9.5) return 'Gem Mint';
  if (grade >= 9) return 'Mint';
  if (grade >= 8) return 'Near Mint';
  if (grade >= 7) return 'Excellent';
  if (grade >= 6) return 'Very Good';
  if (grade >= 4) return 'Good';
  if (grade >= 2) return 'Fair';
  return 'Poor';
}

// Geometric mean, same aggregation Ximilar and most pre-grading tools use —
// a single very low subgrade (e.g. a bad crease) should drag the overall
// grade down hard, not get averaged away by three good subgrades.
function geomean(values: number[]): number {
  const product = values.reduce((acc, v) => acc * Math.max(v, 0.1), 1);
  return Math.pow(product, 1 / values.length);
}

// Coerce a model-supplied predicted grade to a sane 1-10 in 0.5 steps, or null.
function clampGrade(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.min(10, Math.round(n * 2) / 2));
}

interface MeasuredCentering {
  lr: string;
  tb: string;
  grade: number;
  worstOffset?: number;
}

// Only trust a client centering measurement that's structurally well-formed.
function validMeasuredCentering(raw: unknown): MeasuredCentering | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const ratio = /^\d{1,3}\/\d{1,3}$/;
  if (typeof m.lr !== 'string' || !ratio.test(m.lr)) return null;
  if (typeof m.tb !== 'string' || !ratio.test(m.tb)) return null;
  const grade = typeof m.grade === 'number' ? m.grade : Number(m.grade);
  if (!Number.isFinite(grade) || grade < 1 || grade > 10) return null;
  return { lr: m.lr, tb: m.tb, grade: Math.round(grade * 2) / 2 };
}

interface ParsedDataUrl {
  mediaType: string;
  base64: string;
}

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (match) return { mediaType: match[1], base64: match[2] };
  return { mediaType: 'image/jpeg', base64: dataUrl };
}

async function callClaudeVision(
  apiKey: string,
  front: ParsedDataUrl,
  back: ParsedDataUrl | null,
  promptSuffix = '',
) {
  const content: Record<string, unknown>[] = [
    { type: 'text', text: GRADING_PROMPT + promptSuffix },
    { type: 'text', text: 'Front of card:' },
    { type: 'image', source: { type: 'base64', media_type: front.mediaType, data: front.base64 } },
  ];
  if (back) {
    content.push({ type: 'text', text: 'Back of card:' });
    content.push({ type: 'image', source: { type: 'base64', media_type: back.mediaType, data: back.base64 } });
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Could not find JSON in Claude's response: ${text}`);
  return { parsed: JSON.parse(jsonMatch[0]), raw: data };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const { frontImageBase64, backImageBase64, userCardId, cardName, measuredCentering, frontQuality } = await req.json();
    const measured = validMeasuredCentering(measuredCentering);
    if (!frontImageBase64) {
      return new Response(JSON.stringify({ error: 'frontImageBase64 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lazy env check — never at module scope, so cold starts (incl. this
    // OPTIONS preflight above) never crash when the secret isn't configured yet.
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'Card grading is not configured yet.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { count: freeUsed, error: countError } = await serviceClient
      .from('card_grading_scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) throw countError;

    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('purchased_scan_credits')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const isFree = (freeUsed ?? 0) < FREE_SCAN_LIMIT;
    const hasPaidCredit = (profile?.purchased_scan_credits ?? 0) > 0;

    if (!isFree && !hasPaidCredit) {
      return new Response(JSON.stringify({
        error: 'no_credits',
        message: 'You\'ve used all your free scans. Buy a credit pack to keep grading cards.',
        freeScansUsed: freeUsed ?? 0,
        freeScanLimit: FREE_SCAN_LIMIT,
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const front = parseDataUrl(frontImageBase64);
    const back = backImageBase64 ? parseDataUrl(backImageBase64) : null;

    const { parsed: grade, raw: rawResult } = await callClaudeVision(
      anthropicApiKey,
      front,
      back,
      measured ? measuredCenteringNote(measured) : '',
    );

    // On-device geometry wins for centering when we have it — it's a real
    // measurement, not an eyeballed guess (the whole point collectors distrust).
    const centeringSource = measured ? 'measured' : 'ai';
    const centeringGrade = measured ? measured.grade : (grade.centering ?? null);
    const centeringLR = measured ? measured.lr : (grade.centering_ratio_lr ?? null);
    const centeringTB = measured ? measured.tb : (grade.centering_ratio_tb ?? null);

    const overallGrade = Math.round(
      geomean([
        centeringGrade ?? grade.centering,
        grade.corners,
        grade.edges,
        grade.surface,
      ]) * 10
    ) / 10;

    const predicted = {
      psa: clampGrade(grade.predicted_psa),
      bgs: clampGrade(grade.predicted_bgs),
      cgc: clampGrade(grade.predicted_cgc),
      sgc: clampGrade(grade.predicted_sgc),
      tag: clampGrade(grade.predicted_tag),
    };

    // Don't fully trust the model to self-regulate confidence — a front-only
    // submission is structurally less reliable than front+back regardless of
    // how sure the model sounds, so cap it in code rather than prompt-only.
    // A geometric centering measurement removes uncertainty on one axis, so
    // nudge the ceiling up a little when we have one.
    const rawConfidence = typeof grade.confidence === 'number' ? grade.confidence : 50;
    const ceiling = (back ? 100 : 70) + (measured ? 8 : 0);
    const confidence = Math.max(0, Math.min(Math.min(100, ceiling), rawConfidence + (measured ? 5 : 0)));

    // Persist the photos themselves — this is the training set for an
    // eventual in-house model, not just a record of the result.
    const scanId = crypto.randomUUID();
    const ext = front.mediaType.split('/')[1] || 'jpg';
    const frontPath = `${user.id}/${scanId}-front.${ext}`;
    const { error: frontUploadError } = await serviceClient.storage
      .from('card-grading-scans')
      .upload(frontPath, Uint8Array.from(atob(front.base64), (c) => c.charCodeAt(0)), {
        contentType: front.mediaType,
      });
    if (frontUploadError) throw frontUploadError;

    let backPath: string | null = null;
    if (back) {
      backPath = `${user.id}/${scanId}-back.${back.mediaType.split('/')[1] || 'jpg'}`;
      const { error: backUploadError } = await serviceClient.storage
        .from('card-grading-scans')
        .upload(backPath, Uint8Array.from(atob(back.base64), (c) => c.charCodeAt(0)), {
          contentType: back.mediaType,
        });
      if (backUploadError) throw backUploadError;
    }

    const scanRow = {
      id: scanId,
      user_id: user.id,
      user_card_id: userCardId ?? null,
      card_name: cardName ?? null,
      overall_grade: overallGrade,
      condition_label: conditionLabel(overallGrade),
      centering_grade: centeringGrade,
      corners_grade: grade.corners ?? null,
      edges_grade: grade.edges ?? null,
      surface_grade: grade.surface ?? null,
      centering_ratio_lr: centeringLR,
      centering_ratio_tb: centeringTB,
      confidence,
      front_image_path: frontPath,
      back_image_path: backPath,
      // raw_result also carries the on-device metadata — this table doubles as
      // the training set for an eventual in-house model, so keep the geometry.
      raw_result: {
        claude: rawResult,
        meta: {
          centering_source: centeringSource,
          measured_centering: measured ?? null,
          front_quality: frontQuality ?? null,
          predicted,
          ai_centering: {
            grade: grade.centering ?? null,
            lr: grade.centering_ratio_lr ?? null,
            tb: grade.centering_ratio_tb ?? null,
          },
        },
      },
      was_free: isFree,
    };

    const { error: insertError } = await serviceClient.from('card_grading_scans').insert(scanRow);
    if (insertError) throw insertError;

    if (!isFree) {
      const { error: decrementError } = await serviceClient
        .from('profiles')
        .update({ purchased_scan_credits: (profile?.purchased_scan_credits ?? 1) - 1 })
        .eq('id', user.id);
      if (decrementError) throw decrementError;
    }

    return new Response(JSON.stringify({
      ...scanRow,
      raw_result: undefined, // don't ship the full Claude payload back to the client
      centering_source: centeringSource,
      predicted,
      notes: typeof grade.notes === 'string' ? grade.notes : null,
      freeScansRemaining: Math.max(0, FREE_SCAN_LIMIT - ((freeUsed ?? 0) + (isFree ? 1 : 0))),
      purchasedCreditsRemaining: isFree ? (profile?.purchased_scan_credits ?? 0) : (profile?.purchased_scan_credits ?? 1) - 1,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in grade-card function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
