const { createClient } = require('@supabase/supabase-js');

const url = "https://eykzqmbeowapwpakpmvh.supabase.co";
const key = "sb_publishable_2dhaULaTz5GxEphuWWbiaw_kMqdUM1C";
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, blood_group')
    .limit(10);
    
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  
  console.log('PROFILES:', JSON.stringify(data));
}

check();
