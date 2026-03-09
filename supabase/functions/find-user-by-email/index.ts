import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up user by email using admin API
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      // Fallback: search all users for matching email
      const allUsers = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = allUsers.data?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (found) {
        return new Response(JSON.stringify({ user_id: found.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ user_id: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search through users for matching email
    const allUsersResponse = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = allUsersResponse.data?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    return new Response(
      JSON.stringify({ user_id: found?.id || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
