const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
console.error('Supabase config missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
process.exit(1);
}


const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
auth: { persistSession: false }
});


module.exports = supabase;