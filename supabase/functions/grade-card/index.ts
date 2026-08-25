import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A limited number of free scans per user, then purchased credits are consumed.
// Kept low since each scan costs the platform real Ximilar API credits.
const FREE_SCAN_LIMIT = 3;

const XIMILAR_REQUEST_URL = 'https://api.ximilar.com/account/v2/request/';
// Ximilar grading takes ~10-20s per Ximilar's docs; poll with a generous ceiling.
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 20;

interface XimilarGradeRecord {
  side?: string;
  grade?: {
    corners?: number;
    edges?: number;
    surface?: number;
    centering?: number;
    final?: number;
    condition?: string;
  };
  centering?: {
    left_right?: string;
    top_bottom?: string;
  };
}

function stripDataUrlPrefix(base64: string): string {
  const commaIdx = base64.indexOf(',');
  return base64.startsWith('data:') && commaIdx !== -1 ? base64.slice(commaIdx + 1) : base64;
}

async function submitToXimilar(apiKey: string, frontBase64: string, backBase64?: string): Promise<string> {
  const records = [{ _base64: stripDataUrlPrefix(frontBase64) }];
  if (backBase64) records.push({ _base64: stripDataUrlPrefix(backBase64) });

  const res = await fetch(XIMILAR_REQUEST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'card-grader', endpoint: 'grade', records }),
  });
  if (!res.ok) {
    throw new Error(`Ximilar submission failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.id) throw new Error('Ximilar did not return a request id');
  return data.id as string;
}

async function pollXimilar(apiKey: string, requestId: string): Promise<any> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await fetch(`${XIMILAR_REQUEST_URL}${requestId}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Ximilar poll failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    if (data.status === 'done' || data.status === 'completed' || data.records) {
      return data;
    }
    if (data.status === 'failed' || data.status === 'error') {
      throw new Error(`Ximilar grading failed: ${JSON.stringify(data)}`);
    }
  }
  throw new Error('Timed out waiting for Ximilar grading result');
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

    const { frontImageBase64, backImageBase64, userCardId, cardName } = await req.json();
    if (!frontImageBase64) {
      return new Response(JSON.stringify({ error: 'frontImageBase64 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lazy env check — never at module scope, so cold starts (incl. this
    // OPTIONS preflight above) never crash when the secret isn't configured yet.
    const ximilarApiKey = Deno.env.get('XIMILAR_API_KEY');
    if (!ximilarApiKey) {
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

    const requestId = await submitToXimilar(ximilarApiKey, frontImageBase64, backImageBase64);
    const result = await pollXimilar(ximilarApiKey, requestId);

    const records: XimilarGradeRecord[] = result.records ?? [];
    // Front-side record (or the only one) drives the headline grade; Ximilar
    // itself already weights front 70% / back 30% into `final` when both are sent.
    const primary = records[0] ?? {};
    const grade = primary.grade ?? {};

    const scanRow = {
      user_id: user.id,
      user_card_id: userCardId ?? null,
      card_name: cardName ?? null,
      overall_grade: grade.final ?? null,
      condition_label: grade.condition ?? null,
      centering_grade: grade.centering ?? null,
      corners_grade: grade.corners ?? null,
      edges_grade: grade.edges ?? null,
      surface_grade: grade.surface ?? null,
      centering_ratio_lr: primary.centering?.left_right ?? null,
      centering_ratio_tb: primary.centering?.top_bottom ?? null,
      raw_result: result,
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
      raw_result: undefined, // don't ship the full Ximilar payload back to the client
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
