import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Deleting existing buses...');
  // Delete all
  const { error: deleteError } = await supabase.from('buses').delete().neq('id', 'dummy');
  if (deleteError) {
    console.error('Error deleting:', deleteError);
  }

  const newBuses = Array.from({ length: 10 }, (_, i) => ({
    id: `B${i + 1}`,
    active: true,
    driver: ""
  }));

  console.log('Inserting 10 buses...');
  const { error: insertError } = await supabase.from('buses').insert(newBuses);
  
  if (insertError) {
    console.error('Error inserting:', insertError);
  } else {
    console.log('Done!');
  }
}

run();
