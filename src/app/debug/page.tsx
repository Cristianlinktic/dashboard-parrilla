// src/app/debug/page.tsx
import { supabase } from '@/lib/supabaseClient';

export default async function Debug() {
    const { data, error } = await supabase
        .from('dashboard_content')
        .select('*')
        .single();

    return (
        <pre>{error ? `Error: ${error.message}` : JSON.stringify(data, null, 2)}</pre>
    );
}
