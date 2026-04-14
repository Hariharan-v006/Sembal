import { createClient } from "npm:@supabase/supabase-js";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { blood_group, latitude, longitude, request_id } = await req.json();
    if (!blood_group || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: "blood_group, latitude and longitude are required" }), { status: 400 });
    }

    const { data: donors, error: donorError } = await supabase.rpc("find_nearby_donors", {
      p_blood_group: blood_group,
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_km: 30,
    });
    if (donorError) {
      return new Response(JSON.stringify({ error: donorError.message }), { status: 400 });
    }

    for (const donor of donors ?? []) {
      await supabase.from("notifications").insert({
        user_id: donor.id,
        type: "sos",
        title: "Emergency Blood Needed",
        body: `Urgent need for ${blood_group}`,
        data: { request_id: request_id ?? null },
      });
    }

    return new Response(JSON.stringify({ count: (donors ?? []).length, donors }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
    });
  }
});
