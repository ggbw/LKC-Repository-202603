import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: caller.id, _role: 'admin' });
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });

    const { email, password, full_name, role } = await req.json();

    // Create user
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Assign role
    if (role && newUser.user) {
      await supabase.from('user_roles').insert({ user_id: newUser.user.id, role });
    }

    // Set must_change_password
    await supabase.from('profiles').update({ must_change_password: true }).eq('user_id', newUser.user!.id);

    return new Response(JSON.stringify({ user_id: newUser.user!.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
