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
    const { tripId, tripName, sharedWithUserId, sharerName } = await req.json();

    if (!tripId || !sharedWithUserId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get the recipient's email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(sharedWithUserId);
    if (userError || !userData?.user?.email) {
      console.error("Could not find recipient email:", userError);
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = userData.user.email;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not set — skipping email notification");
      return new Response(JSON.stringify({ sent: false, reason: "email_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "SweetSpots <noreply@sweetspots.app>",
        to: [recipientEmail],
        subject: `${sharerName || "Someone"} shared a trip with you on SweetSpots!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
            <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 8px;">🗺️ A trip was shared with you!</h1>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">
              <strong>${sharerName || "A friend"}</strong> shared their trip <strong>"${tripName || "Untitled Trip"}"</strong> with you on SweetSpots.
            </p>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">
              Open SweetSpots to view the full itinerary, including all the spots, timings, and insider tips.
            </p>
            <a href="https://www.findyoursweetspots.com" 
               style="display: inline-block; margin-top: 16px; padding: 12px 28px; background-color: #f97316; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">
              View Trip
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">
              You're receiving this because someone shared a trip with your SweetSpots account.
            </p>
          </div>
        `,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      return new Response(JSON.stringify({ sent: false, error: emailResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-trip-shared error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
