import { createClient } from "npm:@supabase/supabase-js";

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expired = await supabase.rpc("process_expired_requests");
    if (expired.error) {
      return new Response(JSON.stringify({ error: expired.error.message, stage: "process_expired_requests" }), {
        status: 400,
      });
    }

    const eligibility = await supabase.rpc("refresh_eligibility_status");
    if (eligibility.error) {
      return new Response(JSON.stringify({ error: eligibility.error.message, stage: "refresh_eligibility_status" }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
    });
  }
});
