import { createClient } from "npm:@supabase/supabase-js";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { request_id, donor_id } = await req.json();
    if (!request_id || !donor_id) {
      return new Response(JSON.stringify({ error: "request_id and donor_id are required" }), { status: 400 });
    }

    const { data: request, error: requestError } = await supabase
      .from("blood_requests")
      .select("requester_id, hospital_name")
      .eq("id", request_id)
      .single();
    if (requestError || !request) {
      return new Response(JSON.stringify({ error: requestError?.message ?? "Request not found" }), { status: 400 });
    }

    const { data: donor, error: donorError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", donor_id)
      .single();
    if (donorError || !donor) {
      return new Response(JSON.stringify({ error: donorError?.message ?? "Donor not found" }), { status: 400 });
    }

    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: request.requester_id,
      type: "response",
      title: "Donor Accepted",
      body: `${donor.full_name} is ready at ${request.hospital_name}`,
      data: { request_id },
    });
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
    });
  }
});
