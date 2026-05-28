import { createClient } from '@supabase/supabase-js';

// Supabase configuration for dashboard_content (auto‑generated from .env)
const SUPABASE_URL = process.env.NEXT_PUBLIC_dashboard_content_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_dashboard_content_SUPABASE_ANON_KEY || '';


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
