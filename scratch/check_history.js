const { createClient } = require('@supabase/supabase-js');

const url = "https://eykzqmbeowapwpakpmvh.supabase.co";
const key = "sb_publishable_2dhaULaTz5GxEphuWWbiaw_kMqdUM1C";
const supabase = createClient(url, key);

async function check() {
  const { data: responses, error: rErr } = await supabase
    .from('donor_responses')
    .select('*, profiles(full_name), blood_requests(patient_name, hospital_name)')
    .limit(20);
    
  if (rErr) console.error('Responses Error:', rErr);
  console.log('ALL RESPONSES:', JSON.stringify(responses));
  
  const { data: records, error: recErr } = await supabase
    .from('donation_records')
    .select('*')
    .limit(20);
    
  if (recErr) console.error('Records Error:', recErr);
  console.log('ALL DONATION RECORDS:', JSON.stringify(records));
}

check();
