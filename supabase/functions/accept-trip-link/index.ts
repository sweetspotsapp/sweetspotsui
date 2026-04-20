// Accept a shared trip via link. Auto-creates a shared_trips row (view-only)
// for the calling user, so they immediately gain SELECT access to the trip.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Identify the caller using the anon-key client + their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const recipient = userRes.user;

    const { tripId } = await req.json().catch(() => ({}));
    if (!tripId || typeof tripId !== "string") {
      return new Response(JSON.stringify({ error: "tripId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client to bypass RLS for the lookup + insert
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: trip, error: tripErr } = await admin
      .from("trips")
      .select("id, user_id, name, destination")
      .eq("id", tripId)
      .maybeSingle();

    if (tripErr || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Owner opening their own link — no share row needed
    if (trip.user_id === recipient.id) {
      return new Response(
        JSON.stringify({ ok: true, owner: true, tripId: trip.id }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check existing share
    const { data: existing } = await admin
      .from("shared_trips")
      .select("id, status")
      .eq("trip_id", tripId)
      .eq("shared_with", recipient.id)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await admin.from("shared_trips").insert({
        trip_id: tripId,
        shared_by: trip.user_id,
        shared_with: recipient.id,
        permission: "view",
        status: "accepted",
      });
      if (insertErr) {
        console.error("accept-trip-link insert error", insertErr);
        return new Response(JSON.stringify({ error: "Failed to accept" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (existing.status !== "accepted") {
      await admin
        .from("shared_trips")
        .update({ status: "accepted" })
        .eq("id", existing.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tripId: trip.id,
        tripName: trip.name ?? trip.destination,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("accept-trip-link error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
