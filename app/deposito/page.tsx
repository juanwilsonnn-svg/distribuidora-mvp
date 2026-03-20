'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { EstadoPedido, Pedido } from '@/data/mock'

type Tab = 'todos' | 'confirmado' | 'en_preparacion'
type RangoFecha = 'hoy' | '7d' | 'todo' | 'custom'

function urgencia(fechaEntrega: string): 'vencido' | 'hoy' | 'normal' {
  const hoy = new Date().toISOString().slice(0, 10)
  if (fechaEntrega < hoy)   return 'vencido'
  if (fechaEntrega === hoy) return 'hoy'
  return 'normal'
}

function labelFecha(fechaEntrega: string): string {
  const hoy    = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (fechaEntrega < hoy)      return `⚠ VENCIDO (${fechaEntrega})`
  if (fechaEntrega === hoy)    return '⚡ Hoy'
  if (fechaEntrega === manana) return 'Mañana'
  return fechaEntrega
}

function tiempoAtras(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1)  return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h}h ${min % 60}min`
}

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function haceNDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}

export default function Deposito() {
  const { pedidos, cambiarEstado, cancelarPedido } = useApp()

  const [tab,        setTab]        = useState<Tab>('todos')
  const [rango,      setRango]      = useState<RangoFecha>('todo')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Filtro por fecha de entrega
  const desde = rango === 'hoy'    ? hoyStr()
              : rango === '7d'     ? haceNDias(7)
              : rango === 'custom' ? fechaDesde
              : null
  const hasta = rango === 'custom' ? fechaHasta : rango === 'hoy' ? hoyStr() : null

  const activos = pedidos
    .filter(p => {
      if (!['confirmado', 'en_preparacion'].includes(p.estado)) return false
      const fe = p.fechaEntrega ?? ''
      if (desde && fe < desde) return false
      if (hasta && fe > hasta) return false
      return true
    })
    .sort((a, b) => {
      const ua = urgencia(a.fechaEntrega ?? '')
      const ub = urgencia(b.fechaEntrega ?? '')
      const orden = { vencido: 0, hoy: 1, normal: 2 }
      if (orden[ua] !== orden[ub]) return orden[ua] - orden[ub]
      return (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? '')
    })

  const cuentas = {
    todos:          activos.length,
    confirmado:     activos.filter(p => p.estado === 'confirmado').length,
    en_preparacion: activos.filter(p => p.estado === 'en_preparacion').length,
  }

  const filtrados = tab === 'todos' ? activos : activos.filter(p => p.estado === tab)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'todos',          label: 'Todos'          },
    { key: 'confirmado',     label: 'Para preparar'  },
    { key: 'en_preparacion', label: 'En preparación' },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Depósito</div>
          <div className="page-sub">{activos.length} pedido{activos.length !== 1 ? 's' : ''} en cola</div>
        </div>
      </div>

      {/* Filtro de fecha de entrega */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Entrega:</span>
          {(['hoy', '7d', 'todo', 'custom'] as RangoFecha[]).map(r => (
            <button key={r} onClick={() => setRango(r)} style={{
              padding: '5px 12px', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
              background: rango === r ? 'var(--ink)' : 'var(--line)',
              color: rango === r ? '#fff' : 'var(--ink-3)', transition: 'all .12s',
            }}>
              {r === 'hoy' ? 'Hoy' : r === '7d' ? 'Próximos 7 días' : r === 'todo' ? 'Todos' : 'Rango'}
            </button>
          ))}
          {rango === 'custom' && (
            <>
              <input type="date" className="input mono" style={{ width: 150 }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>→</span>
              <input type="date" className="input mono" style={{ width: 150 }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {/* Tabs de estado */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 'var(--r)', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 700, fontSize: 13,
            background: tab === t.key ? 'var(--ink)' : 'var(--line)',
            color: tab === t.key ? '#fff' : 'var(--ink-3)', transition: 'all .13s',
          }}>
            {t.label}
            {cuentas[t.key] > 0 && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, background: tab === t.key ? 'rgba(255,255,255,.2)' : 'var(--muted)', color: '#fff', padding: '1px 7px', borderRadius: 20 }}>
                {cuentas[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">✅</div>
          <div className="empty-title">Sin pedidos en cola</div>
          <div className="empty-sub">{rango !== 'todo' ? 'No hay pedidos para ese período.' : 'No hay nada pendiente ahora.'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtrados.map(p => (
            <DepCard key={p.id} pedido={p} onCambiar={cambiarEstado} onCancelar={cancelarPedido} />
          ))}
        </div>
      )}
    </div>
  )
}

function DepCard({ pedido, onCambiar, onCancelar }: {
  pedido: Pedido
  onCambiar: (id: number, e: EstadoPedido) => void
  onCancelar: (id: number) => void
}) {
  const urg      = urgencia(pedido.fechaEntrega ?? '')
  const barColor = pedido.estado === 'en_preparacion' ? 'var(--amber)' : 'var(--blue)'
  const urgColor = urg === 'vencido' ? 'var(--red)' : urg === 'hoy' ? 'var(--amber)' : 'var(--green)'

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)',
      border: `1px solid ${urg === 'vencido' ? 'var(--red-b)' : 'var(--line)'}`,
      borderLeft: `5px solid ${urg === 'vencido' ? 'var(--red)' : barColor}`,
      boxShadow: 'var(--sh)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 18px 10px', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--line-2)', padding: '2px 8px', borderRadius: 'var(--r)' }}>
              #{String(pedido.id).padStart(4, '0')}
            </span>
            <span style={{ fontWeight: 800, fontSize: 17 }}>{pedido.nombreCliente}</span>
            <span className={`badge badge-${pedido.estado}`}>{pedido.estado.replace('_', ' ')}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{tiempoAtras(pedido.fecha)}</span>
            {pedido.fechaEntrega && (
              <span style={{ fontWeight: 700, color: urgColor }}>📅 {labelFecha(pedido.fechaEntrega)}</span>
            )}
            {pedido.notas && (
              <span style={{ background: 'var(--amber-s)', color: 'var(--amber)', padding: '1px 8px', borderRadius: 4, fontWeight: 600 }}>
                📝 {pedido.notas}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="mono" style={{ fontWeight: 800, fontSize: 20 }}>${pedido.total.toLocaleString('es-AR')}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{pedido.totalKg} kg</div>
        </div>
      </div>

      <div style={{ margin: '0 18px 14px', background: 'var(--line-2)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        {pedido.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < pedido.items.length - 1 ? '1px solid var(--line)' : 'none', fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>{it.nombre}</span>
            <span className="mono" style={{ fontWeight: 700 }}>{it.cantidad} kg</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 18px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {pedido.estado === 'confirmado' && (
          <>
            <button className="btn btn-amber btn-lg" onClick={() => onCambiar(pedido.id, 'en_preparacion')}>🔧 Iniciar preparación</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm(`¿Cancelar pedido de ${pedido.nombreCliente}? Se devolverá el stock.`)) onCancelar(pedido.id) }}>Cancelar</button>
          </>
        )}
        {pedido.estado === 'en_preparacion' && (
          <>
            <button className="btn btn-success btn-lg" onClick={() => onCambiar(pedido.id, 'listo')}>✅ Marcar como listo</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm(`¿Cancelar pedido de ${pedido.nombreCliente}? Se devolverá el stock.`)) onCancelar(pedido.id) }}>Cancelar</button>
          </>
        )}
      </div>
    </div>
  )
}
