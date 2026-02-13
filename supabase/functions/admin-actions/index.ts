import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    // Verify the calling user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "disband_team") {
      const { team_id } = params;
      if (!team_id) throw new Error("team_id required");

      // Delete in order: participants, messages, conversations, matches, members, team
      const { data: convs } = await adminClient
        .from("conversations")
        .select("id")
        .eq("team_id", team_id);

      if (convs) {
        for (const conv of convs) {
          await adminClient.from("conversation_participants").delete().eq("conversation_id", conv.id);
          await adminClient.from("messages").delete().eq("conversation_id", conv.id);
          await adminClient.from("message_reads").delete().eq("conversation_id", conv.id);
        }
        await adminClient.from("conversations").delete().eq("team_id", team_id);
      }

      // Also delete match-based conversations
      const { data: matchConvs } = await adminClient
        .from("matches")
        .select("id")
        .eq("team_id", team_id);

      if (matchConvs) {
        for (const match of matchConvs) {
          const { data: mConvs } = await adminClient
            .from("conversations")
            .select("id")
            .eq("match_id", match.id);
          if (mConvs) {
            for (const mc of mConvs) {
              await adminClient.from("conversation_participants").delete().eq("conversation_id", mc.id);
              await adminClient.from("messages").delete().eq("conversation_id", mc.id);
              await adminClient.from("message_reads").delete().eq("conversation_id", mc.id);
            }
            await adminClient.from("conversations").delete().eq("match_id", match.id);
          }
        }
      }

      await adminClient.from("matches").delete().eq("team_id", team_id);
      await adminClient.from("team_members").delete().eq("team_id", team_id);
      await adminClient.from("teams").delete().eq("id", team_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
