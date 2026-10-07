import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, FileText, Image, Save, Upload, UserRound, Wrench, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import BrandLogo from '../../../shared/components/branding/BrandLogo'
import { HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import { useHotelScope } from '../../../shared/context/HotelScopeContext'
import { supabase } from '../../../lib/supabase'

type WorkOrder = {
  id: string; hotel_id: string; scheduled_job_id: string | null; maintenance_plan_id: string | null
  parent_work_order_id: string | null; resolved_apparatus_registry_id: string | null
  apparatus_registry_id: string | null; ot_number: string; title: string; description: string | null
  work_type: 'PREVENTIVE' | 'CORRECTIVE' | 'ACTUATION'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  completion_timing: 'ON_TIME' | 'OUT_OF_DATE' | null
  assigned_user_id: string | null; assigned_user_name: string | null; assigned_user_email: string | null
  scheduled_date: string | null; started_at: string | null; completed_at: string | null
  completed_by: string | null; observations: string | null
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  maintenance_plan_name: string | null; apparatus_code: string | null; apparatus_name: string | null
  plant: string | null; location: string | null; created_at: string; updated_at: string
}
type Evidence = { id:string; storage_path:string; file_name:string; mime_type:string; file_size:number; uploaded_by:string|null; uploaded_at:string; url:string }

const typeLabels = { PREVENTIVE:'Preventiva', CORRECTIVE:'Correctiva', ACTUATION:'Actuación' } as const
const priorityLabels = { LOW:'Baja', NORMAL:'Normal', HIGH:'Alta', CRITICAL:'Crítica' } as const
const resultOptions = [
  { value:'COMPLETED', label:'Realizada' },
  { value:'COMPLETED_WITH_ISSUES', label:'Realizada con incidencias' },
  { value:'NOT_CONFORM', label:'No conforme' },
] as const

function statusLabel(item:WorkOrder){
  if(item.status==='COMPLETED' && item.completion_timing==='OUT_OF_DATE') return 'Finalizada · Fuera de fecha'
  if(item.status==='PENDING' && item.scheduled_date && item.scheduled_date < new Date().toISOString().slice(0,10)) return 'Vencida'
  if(item.status==='IN_PROGRESS') return 'En curso'
  if(item.status==='COMPLETED') return 'Finalizada'
  return 'Pendiente'
}
function statusTone(item:WorkOrder){
  if(item.status==='COMPLETED' && item.completion_timing==='OUT_OF_DATE') return 'bg-amber-100 text-amber-700'
  if(item.status==='COMPLETED') return 'bg-emerald-100 text-emerald-700'
  if(item.status==='IN_PROGRESS') return 'bg-blue-100 text-blue-700'
  if(item.scheduled_date && item.scheduled_date < new Date().toISOString().slice(0,10)) return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700'
}
function fmtDateTime(v:string|null){ return v ? new Date(v).toLocaleString('es-ES') : '—' }

export default function MaintenanceWorkOrderDetailPage(){
  const navigate=useNavigate()
  const { workOrderId }=useParams<{workOrderId:string}>()
  const { hotel }=useHotelScope()
  const [order,setOrder]=useState<WorkOrder|null>(null)
  const [baseline,setBaseline]=useState<WorkOrder|null>(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [working,setWorking]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [result,setResult]=useState<(typeof resultOptions)[number]['value']>('COMPLETED')
  const [evidence,setEvidence]=useState<Evidence[]>([])
  const [evidenceLoading,setEvidenceLoading]=useState(false)
  const [evidenceSaving,setEvidenceSaving]=useState(false)
  const [correctiveOpen,setCorrectiveOpen]=useState(false)
  const [correctiveTitle,setCorrectiveTitle]=useState('')
  const [correctiveDescription,setCorrectiveDescription]=useState('')
  const [correctivePriority,setCorrectivePriority]=useState<WorkOrder['priority']>('HIGH')
  const galleryRef=useRef<HTMLInputElement|null>(null)
  const canEdit = order?.status === 'IN_PROGRESS'

  async function load(){
    if(!workOrderId) return
    setLoading(true); setError('')
    const q=await supabase.from('maintenance_work_orders_resolved').select('*').eq('id',workOrderId).single()
    if(q.error||!q.data){setError(q.error?.message??'No se ha encontrado la OT.');setLoading(false);return}
    const item=q.data as WorkOrder
    setOrder(item); setBaseline(item); setLoading(false)
  }
  async function loadEvidence(){
    if(!workOrderId)return
    setEvidenceLoading(true)
    const q=await supabase.from('maintenance_work_order_evidence').select('id,storage_path,file_name,mime_type,file_size,uploaded_by,uploaded_at').eq('work_order_id',workOrderId).order('uploaded_at',{ascending:false})
    if(q.error){setError(q.error.message);setEvidenceLoading(false);return}
    const resolved=await Promise.all((q.data??[]).map(async item=>{
      const s=await supabase.storage.from('maintenance-evidence').createSignedUrl(item.storage_path,3600)
      return s.error||!s.data?.signedUrl?null:{...item,url:s.data.signedUrl} as Evidence
    }))
    setEvidence(resolved.filter(Boolean) as Evidence[]); setEvidenceLoading(false)
  }
  useEffect(()=>{void load();void loadEvidence()},[workOrderId])

  const dirty=!!order&&!!baseline&&(order.title!==baseline.title||order.description!==baseline.description||order.scheduled_date!==baseline.scheduled_date||order.priority!==baseline.priority||order.observations!==baseline.observations)

  async function saveChanges(){
    if(!order || !canEdit)return
    setSaving(true);setError('');setMessage('')
    const q=await supabase.from('maintenance_work_orders').update({
      title:order.title.trim(),description:order.description?.trim()||null,scheduled_date:order.scheduled_date||null,
      priority:order.priority,observations:order.observations?.trim()||null,updated_at:new Date().toISOString()
    }).eq('id',order.id)
    setSaving(false)
    if(q.error){setError(q.error.message);return}
    setMessage('OT actualizada correctamente.');await load()
  }

  async function startOrder(){
    if(!order)return
    setWorking(true);setError('');setMessage('')
    const q=await supabase.rpc('start_maintenance_work_order',{target_work_order_id:order.id})
    setWorking(false)
    if(q.error){setError(q.error.message);return}
    setMessage('OT iniciada.');await load()
  }
  async function completeOrder(){
    if(!order)return
    setWorking(true);setError('');setMessage('')
    const q=await supabase.rpc('complete_maintenance_work_order',{
      target_work_order_id:order.id,target_result:result,target_observations:order.observations?.trim()||null
    })
    setWorking(false)
    if(q.error){setError(q.error.message);return}
    setMessage(order.work_type==='PREVENTIVE'
      ? 'OT preventiva finalizada. La próxima revisión y la siguiente OT se han generado automáticamente.'
      : 'OT finalizada correctamente.')
    await load()
  }
  async function uploadPhotos(files:File[]){
    if(!hotel?.id||!order||!canEdit)return
    const images=files.filter(f=>f.type.startsWith('image/'))
    if(!images.length){setError('Selecciona al menos una fotografía.');return}
    setEvidenceSaving(true);setError('')
    try{
      for(const file of images){
        const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_')
        const path=hotel.id+'/'+order.id+'/'+crypto.randomUUID()+'-'+safe
        const up=await supabase.storage.from('maintenance-evidence').upload(path,file,{contentType:file.type,upsert:false})
        if(up.error)throw up.error
        const ins=await supabase.from('maintenance_work_order_evidence').insert({
          hotel_id:hotel.id,work_order_id:order.id,storage_path:path,file_name:file.name,mime_type:file.type,file_size:file.size,
          uploaded_by:(await supabase.auth.getUser()).data.user?.id??null
        })
        if(ins.error){await supabase.storage.from('maintenance-evidence').remove([path]);throw ins.error}
      }
      await loadEvidence()
    }catch(err){setError(err instanceof Error?err.message:'No se han podido guardar las fotografías.')}
    finally{setEvidenceSaving(false);if(galleryRef.current)galleryRef.current.value=''}
  }
  async function removePhoto(item:Evidence){
    if (!canEdit) return
    setEvidenceSaving(true);setError('')
    try{
      const r=await supabase.storage.from('maintenance-evidence').remove([item.storage_path]);if(r.error)throw r.error
      const d=await supabase.from('maintenance_work_order_evidence').delete().eq('id',item.id);if(d.error)throw d.error
      await loadEvidence()
    }catch(err){setError(err instanceof Error?err.message:'No se ha podido eliminar la fotografía.')}
    finally{setEvidenceSaving(false)}
  }
  async function createCorrective(){
    if(!hotel?.id||!order||!correctiveTitle.trim()){setError('Indica la avería detectada.');return}
    setWorking(true);setError('');setMessage('')
    const q=await supabase.rpc('create_operational_work_order',{
      target_hotel_id:hotel.id,target_work_type:'CORRECTIVE',target_title:correctiveTitle.trim(),
      target_description:correctiveDescription.trim()||null,
      target_apparatus_registry_id:order.resolved_apparatus_registry_id||order.apparatus_registry_id||null,
      target_parent_work_order_id:order.id,target_priority:correctivePriority,
      target_scheduled_date:new Date().toISOString().slice(0,10),target_observations:null
    })
    setWorking(false)
    if(q.error){setError(q.error.message);return}
    setCorrectiveOpen(false);setCorrectiveTitle('');setCorrectiveDescription('');setCorrectivePriority('HIGH')
    const created=q.data as WorkOrder
    navigate('/maintenance/work-orders/'+created.id)
  }

  if(loading)return <div className="min-h-screen bg-slate-100 p-4"><div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-lg text-sm">Cargando ficha de OT…</div></div>
  if(!order)return <div className="min-h-screen bg-slate-100 p-4"><div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-lg"><p className="text-sm text-rose-700">{error||'OT no encontrada.'}</p><button type="button" onClick={()=>navigate('/maintenance/work-orders')} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Volver a OTs</button></div></div>

  return <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
    <div className="mx-auto max-w-5xl">
      <header className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo onActivate={()=>navigate('/')} className="h-9 w-auto shrink-0 object-contain sm:h-11"/>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Orden de trabajo</div><h1 className="text-xl font-bold sm:text-2xl">{order.ot_number}</h1><p className="text-xs text-slate-500 sm:text-sm">{hotel?.name??'Hotel'} · {typeLabels[order.work_type]}</p></div>
          </div>
          <div className="arias-mobile-header-actions flex items-center gap-2"><button type="button" onClick={()=>navigate('/maintenance/work-orders')} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowLeft size={17}/>Volver</button><HomeButton onHome={()=>navigate('/')}/></div>
        </div>
      </header>

      {(error||message)&&<div className={error?'mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800':'mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'}>{error||message}</div>}

      <main className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</div><span className={'mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold '+statusTone(order)}>{statusLabel(order)}</span></div>
            <div className="flex flex-wrap gap-2">
              {order.status==='PENDING'&&<button type="button" onClick={()=>void startOrder()} disabled={working} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"><Wrench size={16}/>Iniciar OT</button>}
              {order.status!=='COMPLETED'&&<button type="button" onClick={()=>void completeOrder()} disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 size={16}/>Finalizar OT</button>}
            </div>
          </div>
          {order.status!=='COMPLETED'&&<div className="mt-4 grid gap-3 sm:grid-cols-[240px_1fr]">
            <label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Resultado de cierre</span><select value={result} onChange={e=>setResult(e.target.value as typeof result)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">{resultOptions.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
            <div className="flex items-end text-xs text-slate-500">En una OT preventiva, finalizar desde aquí registra la ejecución real, recalcula la próxima revisión y genera la siguiente OT automáticamente.</div>
          </div>}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold">Datos de la OT</div>
            <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Título</span><input value={order.title} onChange={e=>setOrder({...order,title:e.target.value})} disabled={!canEdit} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
            <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción / trabajo a realizar</span><textarea value={order.description??''} onChange={e=>setOrder({...order,description:e.target.value})} rows={5} disabled={!canEdit} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha prevista</span><input type="date" value={order.scheduled_date??''} onChange={e=>setOrder({...order,scheduled_date:e.target.value||null})} disabled={!canEdit} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
              <label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridad</span><select value={order.priority} onChange={e=>setOrder({...order,priority:e.target.value as WorkOrder['priority']})} disabled={!canEdit} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">{Object.entries(priorityLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
            </div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={()=>void saveChanges()} disabled={saving||!dirty||!canEdit} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>{saving?'Guardando…':'Guardar cambios'}</button></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold">Equipo y ubicación</div>
            <div className="grid gap-2 rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex items-center gap-2"><Wrench size={16}/><span><strong>Equipo:</strong> {order.apparatus_code??'—'} · {order.apparatus_name??'—'}</span></div>
              <div><strong>Ubicación:</strong> {[order.plant,order.location].filter(Boolean).join(' · ')||'—'}</div>
              <div className="flex items-center gap-2"><UserRound size={16}/><span><strong>Asignado:</strong> {order.assigned_user_name??'Sin asignar'}</span></div>
              <div><strong>Origen:</strong> {order.maintenance_plan_name??'OT operativa'}</div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-600"><div><strong>Creada:</strong> {fmtDateTime(order.created_at)}</div><div><strong>Inicio:</strong> {fmtDateTime(order.started_at)}</div><div><strong>Finalización:</strong> {fmtDateTime(order.completed_at)}</div></div>
          </section>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center gap-2"><FileText size={18} className="text-slate-500"/><h2 className="text-sm font-semibold">Observaciones</h2></div>
          <textarea value={order.observations??''} onChange={e=>setOrder({...order,observations:e.target.value})} disabled={!canEdit} rows={6} placeholder="Describe lo realizado, anomalías, comprobaciones y medidas tomadas…" className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none"/>
          <div className="mt-2 flex justify-end"><button type="button" onClick={()=>void saveChanges()} disabled={saving||!dirty||!canEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Save size={15}/>Guardar observaciones</button></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 text-sm font-semibold"><Image size={17}/>Fotografías</div><div className="mt-0.5 text-xs text-slate-500">Evidencias de esta OT.</div></div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>{const f=Array.from(e.target.files??[]);if(f.length)void uploadPhotos(f);e.target.value=''}}/>
                <input id="ot-camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{const f=Array.from(e.target.files??[]);if(f.length)void uploadPhotos(f);e.target.value=''}}/>
                <button type="button" onClick={()=>document.getElementById('ot-camera-input')?.click()} disabled={evidenceSaving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"><Camera size={15}/>Hacer foto</button>
                <button type="button" onClick={()=>galleryRef.current?.click()} disabled={evidenceSaving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"><Upload size={15}/>{evidenceSaving?'Guardando…':'Galería'}</button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">Solo consulta</span>
            )}
          </div>
          {evidenceLoading?<div className="mt-3 text-xs text-slate-400">Cargando fotografías…</div>:evidence.length?<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{evidence.map(x=><div key={x.id} className="group relative overflow-hidden rounded-xl border"><a href={x.url} target="_blank" rel="noreferrer" className="block aspect-square"><img src={x.url} alt={x.file_name} className="h-full w-full object-cover"/></a>{canEdit && <button type="button" onClick={()=>void removePhoto(x)} disabled={evidenceSaving} className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm disabled:opacity-50"><X size={14}/></button>}<div className="truncate border-t bg-white px-2 py-1.5 text-[10px] text-slate-500">{x.file_name}</div></div>)}</div>:<div className="mt-3 rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-xs text-slate-400">Todavía no hay fotografías registradas.</div>}
        </section>

        {canEdit && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2 text-sm font-semibold text-rose-900"><AlertTriangle size={18}/>Avería detectada</div><p className="mt-1 text-xs leading-5 text-rose-800">Crea una OT correctiva vinculada a esta OT con el equipo y la trazabilidad de origen.</p></div>
            <button type="button" onClick={()=>setCorrectiveOpen(true)} disabled={working} className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">+ Crear OT correctiva</button>
          </div>
          {correctiveOpen&&<div className="mt-4 rounded-xl border border-rose-200 bg-white p-4">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Nueva OT correctiva</h2><button type="button" onClick={()=>setCorrectiveOpen(false)} className="p-2 text-slate-500"><X size={17}/></button></div>
            <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Avería / título</span><input value={correctiveTitle} onChange={e=>setCorrectiveTitle(e.target.value)} placeholder="Ej. Cámara 3 sin señal" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
            <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción del problema</span><textarea value={correctiveDescription} onChange={e=>setCorrectiveDescription(e.target.value)} rows={4} placeholder="Síntomas, comprobaciones, ubicación exacta…" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label>
            <label className="mt-3 block max-w-xs"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prioridad</span><select value={correctivePriority} onChange={e=>setCorrectivePriority(e.target.value as WorkOrder['priority'])} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">{Object.entries(priorityLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setCorrectiveOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Cancelar</button><button type="button" onClick={()=>void createCorrective()} disabled={working||!correctiveTitle.trim()} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Crear OT correctiva</button></div>
          </div>}
        </section>
      </main>
    </div>
  </div>
}
