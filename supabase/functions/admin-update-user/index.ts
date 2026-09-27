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

type Assignment = {
  hotel_id?: string
  role_id?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Configuración del servicio incompleta.' }, 500)
  }

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

  let payload: {
    user_id?: string
    full_name?: string
    email?: string
    active?: boolean
    assignments?: Assignment[]
  }

  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Datos de entrada no válidos.' }, 400)
  }

  const userId = payload.user_id?.trim() ?? ''
  const fullName = payload.full_name?.trim() ?? ''
  const email = payload.email?.trim().toLowerCase() ?? ''
  const active = payload.active !== false
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : []

  if (!userId || !fullName || !email) {
    return json({ error: 'Usuario, nombre y correo son obligatorios.' }, 400)
  }

  const [{ data: targetPlatformAdmin, error: targetPlatformError }, { data: targetAuthUser, error: targetAuthError }] =
    await Promise.all([
      admin.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
      admin.auth.admin.getUserById(userId),
    ])

  if (targetPlatformError || targetAuthError || !targetAuthUser.user) {
    return json({ error: 'No se ha podido localizar el usuario.' }, 404)
  }

  if (targetPlatformAdmin) {
    return json({ error: 'Esta cuenta no puede modificarse desde Usuarios.' }, 403)
  }

  const hotelIds = assignments
    .map((assignment) => assignment.hotel_id?.trim() ?? '')
    .filter(Boolean)
  const roleIds = assignments
    .map((assignment) => assignment.role_id?.trim() ?? '')
    .filter(Boolean)

  if (new Set(hotelIds).size !== hotelIds.length) {
    return json({ error: 'Un usuario solo puede tener un rol por hotel.' }, 400)
  }

  if (hotelIds.length !== assignments.length || roleIds.length !== assignments.length) {
    return json({ error: 'Hay asignaciones de hotel o rol no válidas.' }, 400)
  }

  if (assignments.length > 0) {
    const [{ data: hotels, error: hotelsError }, { data: roles, error: rolesError }] = await Promise.all([
      admin.from('hotels').select('id, active').in('id', hotelIds),
      admin.from('roles').select('id, active').in('id', roleIds),
    ])

    if (hotelsError || rolesError) return json({ error: 'No se han podido validar las asignaciones.' }, 500)
    if ((hotels ?? []).length !== hotelIds.length) return json({ error: 'Uno de los hoteles no existe.' }, 400)
    if ((roles ?? []).length !== roleIds.length) return json({ error: 'Uno de los roles no existe.' }, 400)
    if ((hotels ?? []).some((hotel) => !hotel.active)) return json({ error: 'No se puede asignar un hotel inactivo.' }, 400)
    if ((roles ?? []).some((role) => !role.active)) return json({ error: 'No se puede asignar un rol inactivo.' }, 400)
  }

  const previousEmail = targetAuthUser.user.email ?? ''
  const previousFullName = String(targetAuthUser.user.user_metadata?.full_name ?? targetAuthUser.user.user_metadata?.name ?? '')

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
    email,
    user_metadata: {
      ...targetAuthUser.user.user_metadata,
      full_name: fullName,
    },
  })

  if (authUpdateError) return json({ error: authUpdateError.message }, 400)

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      email,
      active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (profileError) {
    await admin.auth.admin.updateUserById(userId, {
      email: previousEmail,
      user_metadata: { ...targetAuthUser.user.user_metadata, full_name: previousFullName },
    })
    return json({ error: 'No se ha podido actualizar el perfil.' }, 500)
  }

  const { error: deleteAssignmentsError } = await admin
    .from('user_hotel_roles')
    .delete()
    .eq('user_id', userId)

  if (deleteAssignmentsError) {
    await admin
      .from('profiles')
      .update({
        full_name: previousFullName || null,
        email: previousEmail || null,
        active: targetAuthUser.user.user_metadata?.active !== false,
      })
    await admin.auth.admin.updateUserById(userId, {
      email: previousEmail,
      user_metadata: { ...targetAuthUser.user.user_metadata, full_name: previousFullName },
    })
    return json({ error: 'No se han podido actualizar los accesos del usuario.' }, 500)
  }

  if (assignments.length > 0) {
    const { error: insertAssignmentsError } = await admin
      .from('user_hotel_roles')
      .insert(assignments.map((assignment) => ({
        user_id: userId,
        hotel_id: assignment.hotel_id,
        role_id: assignment.role_id,
        active,
      })))

    if (insertAssignmentsError) {
      return json({ error: 'No se han podido guardar los nuevos accesos del usuario.' }, 500)
    }
  }

  return json({
    id: userId,
    email,
    full_name: fullName,
    active,
    assignments: assignments.length,
  })
})
