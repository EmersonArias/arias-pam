import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Configuración del servicio incompleta.' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const authHeader = req.headers.get('Authorization') ?? ''
  const accessToken = authHeader.replace(/^Bearer\s+/i, '')
  if (!accessToken) return json({ error: 'Sesión no válida.' }, 401)

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken)
  if (authError || !authData.user) return json({ error: 'Sesión no válida.' }, 401)

  const { data: platformAdmin, error: platformError } = await admin
    .from('platform_admins')
    .select('active')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (platformError) return json({ error: 'No se ha podido verificar el acceso.' }, 500)
  if (!platformAdmin?.active) return json({ error: 'No autorizado.' }, 403)

  let payload: { full_name?: string; email?: string; password?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Datos de entrada no válidos.' }, 400)
  }

  const fullName = payload.full_name?.trim() ?? ''
  const email = payload.email?.trim().toLowerCase() ?? ''
  const password = payload.password ?? ''

  if (!fullName || !email || !password) return json({ error: 'Nombre, correo y contraseña son obligatorios.' }, 400)
  if (password.length < 10) return json({ error: 'La contraseña inicial debe tener al menos 10 caracteres.' }, 400)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError) return json({ error: createError.message }, 400)
  if (!created.user) return json({ error: 'No se ha podido crear el usuario.' }, 500)

  return json({
    id: created.user.id,
    email: created.user.email,
    full_name: fullName,
  }, 201)
})