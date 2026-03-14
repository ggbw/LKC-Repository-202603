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

    const body = await req.json();
    const { action } = body;

    // ── Delete user ──────────────────────────────────────────────────────────
    if (action === 'delete_user') {
      const { user_id } = body;
      if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Deleting from auth.users cascades to profiles and user_roles (via FK ON DELETE CASCADE)
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Reset password ───────────────────────────────────────────────────────
    if (action === 'reset_password') {
      const { user_id, new_password } = body;
      const { error } = await supabase.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await supabase.from('profiles').update({ must_change_password: true }).eq('user_id', user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Bulk create ──────────────────────────────────────────────────────────
    if (action === 'bulk_create') {
      const { users } = body;
      const results: any[] = [];

      for (const u of users) {
        try {
          if (!u.email || !u.full_name || !u.role) {
            results.push({ email: u.email, name: u.full_name, success: false, error: 'Missing required fields' });
            continue;
          }

          // Guard: check if this email already exists in auth to avoid duplicates
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const alreadyExists = existingUsers?.users?.some((eu: any) => eu.email?.toLowerCase() === u.email?.toLowerCase());
          if (alreadyExists) {
            results.push({ email: u.email, name: u.full_name, success: false, error: 'Account already exists for this email' });
            continue;
          }

          const password = (u.full_name.split(' ')[0]?.toLowerCase() || 'user') + Math.floor(1000 + Math.random() * 9000);

          const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email: u.email,
            password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name },
          });

          if (createErr) {
            results.push({ email: u.email, name: u.full_name, success: false, error: createErr.message });
            continue;
          }

          const userId = newUser.user!.id;

          // Assign role
          await supabase.from('user_roles').insert({ user_id: userId, role: u.role });

          // The handle_new_user trigger creates the profile automatically.
          // We only need to update must_change_password — wait a moment for trigger to fire.
          await new Promise((r) => setTimeout(r, 300));
          await supabase.from('profiles').update({ must_change_password: true }).eq('user_id', userId);

          // Link back to source table if specified
          if (u.link_table && u.link_id) {
            const validTables = ['teachers', 'students', 'parents'];
            if (validTables.includes(u.link_table)) {
              await supabase.from(u.link_table).update({ user_id: userId }).eq('id', u.link_id);
            }
          }

          results.push({ email: u.email, name: u.full_name, password, role: u.role, success: true, user_id: userId });
        } catch (err: any) {
          results.push({ email: u.email, name: u.full_name, success: false, error: err.message });
        }
      }

      return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Default: create single user ──────────────────────────────────────────
    const { email, password, full_name, role, link_table, link_id } = body;

    // Guard: check for existing email before creating
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some((eu: any) => eu.email?.toLowerCase() === email?.toLowerCase());
    if (alreadyExists) {
      return new Response(JSON.stringify({ error: 'An account with this email already exists' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const genPassword = password || ((full_name?.split(' ')[0]?.toLowerCase() || 'user') + Math.floor(1000 + Math.random() * 9000));

    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: genPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Assign role
    if (role && newUser.user) {
      await supabase.from('user_roles').insert({ user_id: newUser.user.id, role });
    }

    // Wait for trigger to fire, then update must_change_password
    await new Promise((r) => setTimeout(r, 300));
    await supabase.from('profiles').update({ must_change_password: true }).eq('user_id', newUser.user!.id);

    // Link back to source table
    if (link_table && link_id) {
      const validTables = ['teachers', 'students', 'parents'];
      if (validTables.includes(link_table)) {
        await supabase.from(link_table).update({ user_id: newUser.user!.id }).eq('id', link_id);
      }
    }

    return new Response(JSON.stringify({ user_id: newUser.user!.id, password: genPassword }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
