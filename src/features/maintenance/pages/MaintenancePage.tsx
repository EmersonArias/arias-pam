import { useEffect, useState, type FormEvent } from "react"
import { Bell, Mail, Plus, Save, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../../lib/supabase"
import ActionButton from "../../../shared/components/buttons/ActionButton"
import { BackButton, HomeButton } from "../../../shared/components/navigation/NavigationButtons"
import BrandLogo from "../../../shared/components/branding/BrandLogo"
import { useSystemDialog } from "../../../shared/components/dialogs/SystemDialogProvider"

type Apparatus = { id: string; code: string; name: string; plant: string | null; location: string | null }
type Plan = {
  id: string
  apparatus_registry_id: string | null
  name: string
  description: string | null
  maintenance_type: "INTERNAL" | "EXTERNAL"
  external_company: string | null
  periodicity_value: number | null
  periodicity_unit: "DAY" | "WEEK" | "MONTH" | "YEAR" | "VARIABLE" | null
  start_date: string | null
  next_due_date: string | null
  active: boolean
  apparatus?: { code: string; name: string } | null
}
type Recipient = { user_id: string; full_name: string | null; email: string | null; role_name: string }
type Control = { id?: string; label: string; input_type: "NUMBER" | "TEXT" | "BOOLEAN" | "DATE" | "TIME" | "SELECT"; unit: string; min_value: string; max_value: string; required: boolean }
type FormState = {
  apparatus_registry_id: string
  name: string
  description: string
  maintenance_type: "INTERNAL" | "EXTERNAL"
  external_company: string
  periodicity_value: string
  periodicity_unit: "DAY" | "WEEK" | "MONTH" | "YEAR" | "VARIABLE"
  start_date: string
  active: boolean
  email_enabled: boolean
  days_before: string
  notify_on_due: boolean
  notify_when_overdue: boolean
  overdue_repeat_days: string
  recipient_ids: string[]
  external_emails: string
}

const emptyForm: FormState = {
  apparatus_registry_id: "", name: "", description: "", maintenance_type: "INTERNAL",
  external_company: "", periodicity_value: "1", periodicity_unit: "MONTH", start_date: "",
  active: true, email_enabled: false, days_before: "7", notify_on_due: true,
  notify_when_overdue: true, overdue_repeat_days: "2", recipient_ids: [], external_emails: "",
}
const emptyControl: Control = { label: "", input_type: "NUMBER", unit: "", min_value: "", max_value: "", required: true }

function firstDueDate(startDate: string, value: string, unit: FormState["periodicity_unit"]) {
  if (!startDate || unit === "VARIABLE") return startDate || null
  const amount = Number(value)
  if (!Number.isInteger(amount) || amount <= 0) return startDate
  const date = new Date(startDate + "T12:00:00")
  if (unit === "DAY") date.setDate(date.getDate() + amount)
  if (unit === "WEEK") date.setDate(date.getDate() + amount * 7)
  if (unit === "MONTH") date.setMonth(date.getMonth() + amount)
  if (unit === "YEAR") date.setFullYear(date.getFullYear() + amount)
  return date.toISOString().slice(0, 10)
}

export default function MaintenancePage() {
  const navigate = useNavigate()
  const { alert: showAlert } = useSystemDialog()
  const [hotelId, setHotelId] = useState("")
  const [apparatus, setApparatus] = useState<Apparatus[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [controls, setControls] = useState<Control[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadBase() {
    setLoading(true); setError("")
    const hotel = await supabase.from("hotels").select("id").eq("active", true).order("name").limit(1).maybeSingle()
    if (hotel.error || !hotel.data?.id) { setError(hotel.error?.message ?? "No se ha podido determinar el hotel activo."); setLoading(false); return }
    const id = hotel.data.id as string; setHotelId(id)
    const [a, p, r] = await Promise.all([
      supabase.from("apparatus_registry").select("id, code, name, plant, location").eq("hotel_id", id).eq("active", true).order("code"),
      supabase.from("maintenance_plans").select("id, apparatus_registry_id, name, description, maintenance_type, external_company, periodicity_value, periodicity_unit, start_date, next_due_date, active, apparatus_registry(code, name)").eq("hotel_id", id).order("next_due_date", { ascending: true, nullsFirst: false }),
      supabase.rpc("get_maintenance_alert_recipients", { target_hotel_id: id }),
    ])
    const firstError = a.error ?? p.error ?? r.error
    if (firstError) setError(firstError.message)
    else { setApparatus((a.data ?? []) as Apparatus[]); setPlans((p.data ?? []) as unknown as Plan[]); setRecipients((r.data ?? []) as Recipient[]) }
    setLoading(false)
  }

  useEffect(() => { void loadBase() }, [])

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) { setForm((current) => ({ ...current, [field]: value })) }
  function newPlan() {
    setSelectedId(null); setControls([{ ...emptyControl }]);
    setForm({ ...emptyForm, start_date: new Date().toISOString().slice(0, 10) }); setError("")
  }

  async function selectPlan(plan: Plan) {
    setSelectedId(plan.id); setError("")
    const [c, config] = await Promise.all([
      supabase.from("maintenance_controls").select("id, label, input_type, unit, min_value, max_value, required").eq("maintenance_plan_id", plan.id).order("sort_order"),
      supabase.from("maintenance_alert_configs").select("id, email_enabled, days_before, notify_on_due, notify_when_overdue, overdue_repeat_days").eq("maintenance_plan_id", plan.id).maybeSingle(),
    ])
    if (c.error || config.error) { setError(c.error?.message ?? config.error?.message ?? "No se ha podido cargar el mantenimiento."); return }
    let recipientIds: string[] = []
    let externalEmails = ""
    if (config.data?.id) {
      const [u, e] = await Promise.all([
        supabase.from("maintenance_alert_users").select("user_id").eq("alert_config_id", config.data.id),
        supabase.from("maintenance_alert_emails").select("email").eq("alert_config_id", config.data.id).order("created_at"),
      ])
      if (u.error || e.error) { setError(u.error?.message ?? e.error?.message ?? "No se han podido cargar los destinatarios."); return }
      recipientIds = (u.data ?? []).map((row) => row.user_id)
      externalEmails = (e.data ?? []).map((row) => row.email).join("\n")
    }
    setControls(((c.data ?? []) as Array<{ id: string; label: string; input_type: Control["input_type"]; unit: string | null; min_value: number | null; max_value: number | null; required: boolean }>).map((row) => ({
      id: row.id, label: row.label, input_type: row.input_type, unit: row.unit ?? "",
      min_value: row.min_value?.toString() ?? "", max_value: row.max_value?.toString() ?? "", required: row.required,
    })))
    setForm({
      apparatus_registry_id: plan.apparatus_registry_id ?? "", name: plan.name, description: plan.description ?? "",
      maintenance_type: plan.maintenance_type, external_company: plan.external_company ?? "",
      periodicity_value: plan.periodicity_value?.toString() ?? "", periodicity_unit: plan.periodicity_unit ?? "VARIABLE",
      start_date: plan.start_date ?? "", active: plan.active, email_enabled: config.data?.email_enabled ?? false,
      days_before: config.data?.days_before?.toString() ?? "7", notify_on_due: config.data?.notify_on_due ?? true,
      notify_when_overdue: config.data?.notify_when_overdue ?? true, overdue_repeat_days: config.data?.overdue_repeat_days?.toString() ?? "2",
      recipient_ids: recipientIds, external_emails: externalEmails,
    })
  }

  function updateControl(index: number, field: keyof Control, value: string | boolean) {
    setControls((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }

  function parseEmails(value: string) { return Array.from(new Set(value.split(/[;,\n]/g).map((email) => email.trim().toLowerCase()).filter(Boolean))) }

  async function save(event: FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError("")
    if (!hotelId || !form.apparatus_registry_id || !form.name.trim()) { setError("Indica el equipo o instalación y el nombre del mantenimiento."); setSaving(false); return }
    if (form.maintenance_type === "EXTERNAL" && !form.external_company.trim()) { setError("Indica la empresa mantenedora para un mantenimiento externo."); setSaving(false); return }
    if (form.periodicity_unit !== "VARIABLE" && (!Number.isInteger(Number(form.periodicity_value)) || Number(form.periodicity_value) <= 0)) { setError("La periodicidad debe ser un número entero mayor que cero."); setSaving(false); return }
    const numericControls = controls.filter((control) => control.label.trim() && control.input_type === "NUMBER")
    if (numericControls.some((control) => control.min_value && control.max_value && Number(control.min_value) > Number(control.max_value))) { setError("Hay un rango de control incorrecto."); setSaving(false); return }
    const planPayload = {
      hotel_id: hotelId, apparatus_registry_id: form.apparatus_registry_id, name: form.name.trim(), description: form.description.trim() || null,
      maintenance_type: form.maintenance_type, external_company: form.maintenance_type === "EXTERNAL" ? form.external_company.trim() : null,
      periodicity_value: form.periodicity_unit === "VARIABLE" ? null : Number(form.periodicity_value), periodicity_unit: form.periodicity_unit,
      start_date: form.start_date || null, next_due_date: firstDueDate(form.start_date, form.periodicity_value, form.periodicity_unit), active: form.active,
    }
    let planId = selectedId
    if (planId) {
      const result = await supabase.from("maintenance_plans").update(planPayload).eq("id", planId)
      if (result.error) { setError(result.error.message); setSaving(false); return }
    } else {
      const result = await supabase.from("maintenance_plans").insert(planPayload).select("id").single()
      if (result.error || !result.data?.id) { setError(result.error?.message ?? "No se ha podido crear el mantenimiento."); setSaving(false); return }
      planId = result.data.id
    }
    if (!planId) { setError("No se ha podido determinar el mantenimiento."); setSaving(false); return }
    const rows = controls.filter((control) => control.label.trim()).map((control, index) => ({
      ...(control.id ? { id: control.id } : {}), maintenance_plan_id: planId, label: control.label.trim(), input_type: control.input_type,
      unit: control.unit.trim() || null, min_value: control.input_type === "NUMBER" && control.min_value ? Number(control.min_value) : null,
      max_value: control.input_type === "NUMBER" && control.max_value ? Number(control.max_value) : null, required: control.required,
      sort_order: index, active: true, alert_on_out_of_range: control.input_type === "NUMBER",
    }))
    if (rows.length) { const result = await supabase.from("maintenance_controls").upsert(rows); if (result.error) { setError(result.error.message); setSaving(false); return } }
    const config = await supabase.from("maintenance_alert_configs").upsert({
      maintenance_plan_id: planId, email_enabled: form.email_enabled, days_before: Math.max(0, Number(form.days_before) || 0),
      notify_on_due: form.notify_on_due, notify_when_overdue: form.notify_when_overdue, overdue_repeat_days: Math.max(1, Number(form.overdue_repeat_days) || 1),
    }, { onConflict: "maintenance_plan_id" }).select("id").single()
    if (config.error || !config.data?.id) { setError(config.error?.message ?? "No se ha podido guardar la configuración de avisos."); setSaving(false); return }
    const configId = config.data.id
    await supabase.from("maintenance_alert_users").delete().eq("alert_config_id", configId)
    if (form.recipient_ids.length) { const result = await supabase.from("maintenance_alert_users").insert(form.recipient_ids.map((userId) => ({ alert_config_id: configId, user_id: userId }))); if (result.error) { setError(result.error.message); setSaving(false); return } }
    await supabase.from("maintenance_alert_emails").delete().eq("alert_config_id", configId)
    const emails = parseEmails(form.external_emails)
    if (emails.length) { const result = await supabase.from("maintenance_alert_emails").insert(emails.map((email) => ({ alert_config_id: configId, email }))); if (result.error) { setError(result.error.message); setSaving(false); return } }
    await loadBase(); setSelectedId(planId); setSaving(false)
    await showAlert({ title: "Mantenimiento guardado", message: "La configuración se ha guardado correctamente.", variant: "info" })
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-4 flex items-center justify-between">
          <BrandLogo label="Inicio Arias Suite" onActivate={() => navigate("/")} className="h-14 w-auto object-contain sm:h-16" />
          <div className="flex items-center gap-2"><BackButton onBack={() => navigate(-1)} /><HomeButton onHome={() => navigate("/")} /></div>
        </div>
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="text-xl font-semibold">Mantenimientos</h1><p className="mt-1 text-sm text-slate-500">Configuración de revisiones, controles y avisos automáticos.</p></div>
            <ActionButton icon={Plus} label="Nuevo mantenimiento" onClick={newPlan} />
          </div>
        </header>
        {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        <main className="mt-4 grid gap-4 xl:grid-cols-[420px_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Planes de mantenimiento</div>
            {loading ? <div className="p-8 text-center text-sm text-slate-500">Cargando…</div> : plans.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Todavía no hay mantenimientos configurados.</div> :
              <div className="max-h-[calc(100vh-220px)] overflow-auto">{plans.map((plan) => <button key={plan.id} type="button" onClick={() => void selectPlan(plan)} className={"w-full border-b border-slate-100 px-4 py-3 text-left transition " + (selectedId === plan.id ? "bg-blue-50" : "hover:bg-slate-50")}>
                <div className="font-medium">{plan.name}</div><div className="mt-1 text-xs text-slate-500">{plan.apparatus?.code ?? "—"} · {plan.apparatus?.name ?? "Equipo no disponible"}</div><div className="mt-1 text-xs text-slate-500">Próxima: {plan.next_due_date ?? "Sin fecha"}</div>
              </button>)}</div>
            }
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!form.name ? <div className="flex min-h-[520px] items-center justify-center text-center"><div><Bell className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-semibold text-slate-700">Configura un mantenimiento</h2><p className="mt-2 max-w-md text-sm text-slate-500">Define el equipo, periodicidad, controles y las personas que deben recibir los avisos.</p></div></div> :
            <form onSubmit={save} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label><span className="mb-1 block text-sm font-medium">Equipo / instalación</span><select value={form.apparatus_registry_id} onChange={(e) => setField("apparatus_registry_id", e.target.value)} className="w-full rounded-xl border px-3 py-2"><option value="">Selecciona un equipo…</option>{apparatus.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}{item.plant ? " · " + item.plant : ""}{item.location ? " · " + item.location : ""}</option>)}</select></label>
                <label><span className="mb-1 block text-sm font-medium">Nombre del mantenimiento</span><input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ej.: Revisión mensual ascensor" className="w-full rounded-xl border px-3 py-2" /></label>
                <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">Descripción</span><textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} className="w-full rounded-xl border px-3 py-2" /></label>
                <label><span className="mb-1 block text-sm font-medium">Tipo</span><select value={form.maintenance_type} onChange={(e) => setField("maintenance_type", e.target.value as FormState["maintenance_type"])} className="w-full rounded-xl border bg-white px-3 py-2"><option value="INTERNAL">Interno</option><option value="EXTERNAL">Externo</option></select></label>
                {form.maintenance_type === "EXTERNAL" && <label><span className="mb-1 block text-sm font-medium">Empresa mantenedora</span><input value={form.external_company} onChange={(e) => setField("external_company", e.target.value)} placeholder="Ej.: KONE" className="w-full rounded-xl border px-3 py-2" /></label>}
                <label><span className="mb-1 block text-sm font-medium">Periodicidad</span><div className="grid grid-cols-[110px_1fr] gap-2"><input type="number" min={1} value={form.periodicity_value} disabled={form.periodicity_unit === "VARIABLE"} onChange={(e) => setField("periodicity_value", e.target.value)} className="rounded-xl border px-3 py-2 disabled:bg-slate-100" /><select value={form.periodicity_unit} onChange={(e) => setField("periodicity_unit", e.target.value as FormState["periodicity_unit"])} className="rounded-xl border bg-white px-3 py-2"><option value="DAY">Día(s)</option><option value="WEEK">Semana(s)</option><option value="MONTH">Mes(es)</option><option value="YEAR">Año(s)</option><option value="VARIABLE">Variable</option></select></div></label>
                <label><span className="mb-1 block text-sm font-medium">Inicio</span><input type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} className="w-full rounded-xl border px-3 py-2" /></label>
                <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)} />Mantenimiento activo</label>
              </div>
              <section className="rounded-2xl border bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Controles de la revisión</h2><p className="text-xs text-slate-500">Cada control valida su propio valor y puede generar su propia alerta.</p></div><button type="button" onClick={() => setControls((current) => [...current, { ...emptyControl }])} className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm"><Plus size={16} />Añadir control</button></div>
                <div className="space-y-3">{controls.map((control, index) => <div key={control.id ?? "new-" + index} className="rounded-xl border bg-white p-3"><div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"><input value={control.label} onChange={(e) => updateControl(index, "label", e.target.value)} placeholder="Ej.: Cloro libre" className="rounded-lg border px-3 py-2" /><select value={control.input_type} onChange={(e) => updateControl(index, "input_type", e.target.value)} className="rounded-lg border bg-white px-3 py-2"><option value="NUMBER">Número</option><option value="TEXT">Texto</option><option value="BOOLEAN">Sí / No</option><option value="DATE">Fecha</option><option value="TIME">Hora</option><option value="SELECT">Selección</option></select><input value={control.unit} onChange={(e) => updateControl(index, "unit", e.target.value)} placeholder="Unidad" className="rounded-lg border px-3 py-2" /><div className="grid grid-cols-2 gap-2"><input type="number" value={control.min_value} disabled={control.input_type !== "NUMBER"} onChange={(e) => updateControl(index, "min_value", e.target.value)} placeholder="Mín." className="rounded-lg border px-3 py-2 disabled:bg-slate-100" /><input type="number" value={control.max_value} disabled={control.input_type !== "NUMBER"} onChange={(e) => updateControl(index, "max_value", e.target.value)} placeholder="Máx." className="rounded-lg border px-3 py-2 disabled:bg-slate-100" /></div><button type="button" onClick={() => setControls((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 text-rose-600" title="Eliminar control"><Trash2 size={17} /></button></div><label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={control.required} onChange={(e) => updateControl(index, "required", e.target.checked)} />Dato obligatorio para considerar realizada la revisión</label></div>)}</div>
              </section>
              <section className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start gap-3"><Mail className="mt-0.5 text-slate-500" size={20} /><div className="flex-1"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Avisos por email</h2><p className="text-xs text-slate-500">Avisos internos de control. No se envían automáticamente a la empresa mantenedora.</p></div><label className="inline-flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.email_enabled} onChange={(e) => setField("email_enabled", e.target.checked)} />Activar</label></div>
                <div className="mt-4 grid gap-4 md:grid-cols-3"><label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Aviso previo (días)</span><input type="number" min={0} value={form.days_before} onChange={(e) => setField("days_before", e.target.value)} className="w-full rounded-lg border px-3 py-2" /></label><label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.notify_on_due} onChange={(e) => setField("notify_on_due", e.target.checked)} />Avisar el día previsto</label><label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={form.notify_when_overdue} onChange={(e) => setField("notify_when_overdue", e.target.checked)} />Avisar si vence</label></div>
                <label className="mt-3 block max-w-xs"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Repetir vencido (días)</span><input type="number" min={1} value={form.overdue_repeat_days} onChange={(e) => setField("overdue_repeat_days", e.target.value)} className="w-full rounded-lg border px-3 py-2" /></label>
                <div className="mt-5"><h3 className="text-sm font-semibold">Usuarios SSTT del hotel</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{recipients.map((recipient) => { const checked = form.recipient_ids.includes(recipient.user_id); return <label key={recipient.user_id} className="flex items-start gap-3 rounded-lg border bg-white px-3 py-2"><input type="checkbox" checked={checked} onChange={() => setField("recipient_ids", checked ? form.recipient_ids.filter((id) => id !== recipient.user_id) : [...form.recipient_ids, recipient.user_id])} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-medium">{recipient.full_name ?? "Usuario"}</span><span className="block text-xs text-slate-500">{recipient.role_name}{recipient.email ? " · " + recipient.email : " · Sin correo"}</span></span></label> })}</div>{recipients.length === 0 && <p className="mt-2 text-xs text-slate-500">No hay usuarios SSTT activos disponibles.</p>}</div>
                <label className="mt-5 block"><span className="mb-1 block text-sm font-semibold">Otros destinatarios</span><textarea value={form.external_emails} onChange={(e) => setField("external_emails", e.target.value)} rows={3} placeholder="Uno o varios emails, separados por salto de línea, coma o punto y coma." className="w-full rounded-lg border bg-white px-3 py-2" /></label>
                </div></div>
              </section>
              <div className="flex justify-end border-t pt-4"><ActionButton icon={Save} label={saving ? "Guardando…" : "Guardar mantenimiento"} tone="primary" disabled={saving} /></div>
            </form>}
          </section>
        </main>
      </div>
    </div>
  )
}