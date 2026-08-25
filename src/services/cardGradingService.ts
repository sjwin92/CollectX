import { supabase as supabaseTyped } from '@/integrations/supabase/client';
const supabase = supabaseTyped as any;

export interface CardGradeResult {
  overall_grade: number | null;
  condition_label: string | null;
  centering_grade: number | null;
  corners_grade: number | null;
  edges_grade: number | null;
  surface_grade: number | null;
  centering_ratio_lr: string | null;
  centering_ratio_tb: string | null;
  was_free: boolean;
  freeScansRemaining: number;
  purchasedCreditsRemaining: number;
}

export interface ScanQuota {
  freeScansUsed: number;
  freeScanLimit: number;
  purchasedCredits: number;
}

const FREE_SCAN_LIMIT = 3;

export const getScanQuota = async (): Promise<ScanQuota> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { freeScansUsed: 0, freeScanLimit: FREE_SCAN_LIMIT, purchasedCredits: 0 };

  const [{ count }, { data: profile }] = await Promise.all([
    supabase.from('card_grading_scans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('profiles').select('purchased_scan_credits').eq('id', user.id).maybeSingle(),
  ]);

  return {
    freeScansUsed: count ?? 0,
    freeScanLimit: FREE_SCAN_LIMIT,
    purchasedCredits: profile?.purchased_scan_credits ?? 0,
  };
};

export class GradeCardError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

export const gradeCard = async (
  frontImageBase64: string,
  backImageBase64?: string,
  userCardId?: string,
  cardName?: string,
): Promise<CardGradeResult> => {
  const { data, error } = await supabase.functions.invoke('grade-card', {
    body: { frontImageBase64, backImageBase64, userCardId, cardName },
  });
  if (error) {
    const context = (error as { context?: { json?: () => Promise<any> } }).context;
    if (context?.json) {
      try {
        const body = await context.json();
        if (body?.error) throw new GradeCardError(body.message || body.error, body.error);
      } catch (parsed) {
        if (parsed instanceof GradeCardError) throw parsed;
        // fall through to generic error below
      }
    }
    throw error;
  }
  return data as CardGradeResult;
};

export const createScanCreditCheckout = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('create-scan-credit-checkout');
  if (error) throw error;
  return (data as { url: string }).url;
};

export const getMyScanHistory = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('card_grading_scans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
