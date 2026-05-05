const { createClient } = require("@supabase/supabase-js");

const normalizeSupabaseUrl = (rawUrl) => {
  if (!rawUrl) {
    throw new Error("SUPABASE_URL is required");
  }

  return rawUrl.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
};

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
