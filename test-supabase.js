require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_dashboard_content_SUPABASE_URL,
  process.env.NEXT_PUBLIC_dashboard_content_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Upserting test item...");
  let res = await supabase.from('dashboard_content').upsert({ id: 'delete_test', content: { id: 'delete_test', desc: 'test' } });
  console.log("Upsert error:", res.error);

  console.log("Deleting test item...");
  res = await supabase.from('dashboard_content').delete().eq('id', 'delete_test');
  console.log("Delete error:", res.error);
  console.log("Delete count:", res.count, "Data:", res.data);

  let check = await supabase.from('dashboard_content').select('*').eq('id', 'delete_test');
  console.log("Exists after delete:", check.data.length > 0);
}
test();
