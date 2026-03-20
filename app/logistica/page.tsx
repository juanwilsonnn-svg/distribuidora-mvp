'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { Pedido } from '@/data/mock'

type RangoFecha = 'hoy' | '7d' | 'todo' | 'custom'

function labelFecha(fechaEntrega: string): { texto: string; urgente: boolean; vencido: boolean } {
  const hoy    = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (fechaEntrega < hoy)      return { texto: '⚠ VENCIDO',  urgente: true,  vencido: true  }
  if (fechaEntrega === hoy)    return { texto: '⚡ Hoy',      urgente: true,  vencido: false }
  if (fechaEntrega === manana) return { texto: 'Mañana',      urgente: false, vencido: false }
  return                              { texto: fechaEntrega,  urgente: false, vencido: false }
}

function tiempoAtras(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1)  return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h}h ${min % 60 > 0 ? ` ${min % 60}min` : ''}`
}

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function haceNDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}

// ── Exportar a CSV para Excel ─────────────────────────────────────────────────
function exportarCSV(pedidos: Pedido[], clientes: ReturnType<typeof useApp>['clientes'], rango: string) {
  const filas: string[][] = []

  // Encabezado principal
  filas.push([`KUKUI — Hoja de reparto`])
  filas.push([`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`])
  filas.push([`Período: ${rango}`])
  filas.push([]) // línea vacía

  // Encabezados de columnas
  filas.push(['#', 'Cliente', 'Dirección', 'Teléfono', 'Entrega', 'Estado', 'Producto', 'Cantidad', 'Precio unit.', 'Subtotal', 'Total pedido', 'Notas'])

  // Datos — una fila por ítem
  for (const p of pedidos) {
    const cliente = clientes.find(c => c.id === p.clienteId)
    const direccion = cliente?.direccion ?? ''
    const telefono  = cliente?.telefono ?? ''

    if (p.items.length === 0) {
      filas.push([
        `#${String(p.id).padStart(4, '0')}`,
        p.nombreCliente, direccion, telefono,
        p.fechaEntrega ?? '', p.estado,
        '—', '', '', '',
        `$${p.total.toLocaleString('es-AR')}`,
        p.notas,
      ])
    } else {
      p.items.forEach((it, i) => {
        filas.push([
          i === 0 ? `#${String(p.id).padStart(4, '0')}` : '',
          i === 0 ? p.nombreCliente : '',
          i === 0 ? direccion : '',
          i === 0 ? telefono : '',
          i === 0 ? (p.fechaEntrega ?? '') : '',
          i === 0 ? p.estado : '',
          it.nombre,
          String(it.cantidad),
          `$${it.precioUnitario.toLocaleString('es-AR')}`,
          `$${it.subtotal.toLocaleString('es-AR')}`,
          i === 0 ? `$${p.total.toLocaleString('es-AR')}` : '',
          i === 0 ? p.notas : '',
        ])
      })
    }
    // Línea separadora entre pedidos
    filas.push([])
  }

  // Totales finales
  const totalGeneral = pedidos.reduce((s, p) => s + p.total, 0)
  filas.push(['', '', '', '', '', '', '', '', '', '', `TOTAL: $${totalGeneral.toLocaleString('es-AR')}`, ''])

  // Generar CSV con BOM para que Excel lo abra bien con tildes
  const bom = '\uFEFF'
  const csv = bom + filas.map(fila =>
    fila.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')
  ).join('\r\n')

  // Descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `kukui-reparto-${hoyStr()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Logistica() {
  const { pedidos, clientes, cambiarEstado } = useApp()

  const [rango,      setRango]      = useState<RangoFecha>('hoy')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const desde = rango === 'hoy'    ? hoyStr()
              : rango === '7d'     ? haceNDias(7)
              : rango === 'custom' ? fechaDesde
              : null
  const hasta = rango === 'custom' ? fechaHasta : rango === 'hoy' ? hoyStr() : null

  const aplicarFiltro = (p: Pedido) => {
    const fe = p.fechaEntrega ?? ''
    if (desde && fe < desde) return false
    if (hasta && fe > hasta) return false
    return true
  }

  const listos = pedidos
    .filter(p => p.estado === 'listo' && aplicarFiltro(p))
    .sort((a, b) => (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? ''))

  const enEntrega = pedidos
    .filter(p => p.estado === 'en_entrega' && aplicarFiltro(p))
    .sort((a, b) => (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? ''))

  const todosParaExport = [...listos, ...enEntrega]

  const labelRango = rango === 'hoy' ? 'Hoy ' + hoyStr()
    : rango === '7d' ? 'Próximos 7 días'
    : rango === 'custom' ? `${fechaDesde} → ${fechaHasta}`
    : 'Todos'

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Logística</div>
          <div className="page-sub">{listos.length} para despachar · {enEntrega.length} en camino</div>
        </div>
        {todosParaExport.length > 0 && (
          <button
            className="btn btn-ghost"
            onClick={() => exportarCSV(todosParaExport, clientes, labelRango)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📥 Exportar hoja de reparto
          </button>
        )}
      </div>

      {/* Filtro */}
      <div className="card" style={{ marginBottom: 20 }}>
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

      {/* Listos para despachar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #7e22ce22' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: listos.length > 0 ? '#7e22ce' : 'var(--muted)' }} />
          <span style={{ fontWeight: 800, fontSize: 16, color: listos.length > 0 ? '#7e22ce' : 'var(--muted)' }}>Listos para despachar</span>
          {listos.length > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, background: '#7e22ce', color: '#fff', padding: '1px 9px', borderRadius: 20 }}>{listos.length}</span>
          )}
        </div>
        {listos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 20px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--line)', color: 'var(--muted)', fontSize: 13 }}>
            {rango !== 'todo' ? 'No hay pedidos listos para ese período.' : 'No hay pedidos listos para despachar.'}<br />
            <span style={{ fontSize: 12, marginTop: 4, display: 'block' }}>Los pedidos marcados como "listo" en el depósito aparecerán acá.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listos.map(p => <LogCard key={p.id} pedido={p} clientes={clientes} onCambiar={cambiarEstado} accentColor="#7e22ce" />)}
          </div>
        )}
      </div>

      {/* En camino */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid var(--amber-b)' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: enEntrega.length > 0 ? 'var(--amber)' : 'var(--muted)' }} />
          <span style={{ fontWeight: 800, fontSize: 16, color: enEntrega.length > 0 ? 'var(--amber)' : 'var(--muted)' }}>En camino</span>
          {enEntrega.length > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, background: 'var(--amber)', color: '#fff', padding: '1px 9px', borderRadius: 20 }}>{enEntrega.length}</span>
          )}
        </div>
        {enEntrega.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 20px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--line)', color: 'var(--muted)', fontSize: 13 }}>
            {rango !== 'todo' ? 'No hay pedidos en camino para ese período.' : 'No hay pedidos en camino ahora.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enEntrega.map(p => <LogCard key={p.id} pedido={p} clientes={clientes} onCambiar={cambiarEstado} accentColor="var(--amber)" />)}
          </div>
        )}
      </div>
    </div>
  )
}

function LogCard({ pedido, clientes, onCambiar, accentColor }: {
  pedido: Pedido
  clientes: ReturnType<typeof useApp>['clientes']
  onCambiar: (id: number, e: any) => void
  accentColor: string
}) {
  const isListo     = pedido.estado === 'listo'
  const isEnEntrega = pedido.estado === 'en_entrega'
  const cliente     = clientes.find(c => c.id === pedido.clienteId)
  const fecha       = pedido.fechaEntrega ? labelFecha(pedido.fechaEntrega) : null

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--r-lg)',
      border: `1px solid ${fecha?.vencido ? 'var(--red-b)' : 'var(--line)'}`,
      borderLeft: `5px solid ${fecha?.vencido ? 'var(--red)' : accentColor}`,
      boxShadow: 'var(--sh)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 18px 10px', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--line-2)', padding: '2px 8px', borderRadius: 'var(--r)' }}>
              #{String(pedido.id).padStart(4, '0')}
            </span>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{pedido.nombreCliente}</span>
            <span className={`badge badge-${pedido.estado}`}>{pedido.estado.replace('_', ' ')}</span>
          </div>
          {cliente && (
            <div style={{ display: 'flex', gap: 12, fontSize: 13, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>📍 {cliente.direccion}</span>
              <a href={`tel:${cliente.telefono}`} style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--mono)' }}>
                📞 {cliente.telefono}
              </a>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{tiempoAtras(pedido.fecha)}</span>
            {fecha && (
              <span style={{ fontWeight: 700, color: fecha.vencido ? 'var(--red)' : fecha.urgente ? 'var(--amber)' : 'var(--green)' }}>
                📅 {fecha.texto}
              </span>
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

      <div style={{ padding: '0 18px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {isListo && (
          <button className="btn btn-lg" style={{ background: '#7e22ce', color: '#fff', minWidth: 180 }} onClick={() => onCambiar(pedido.id, 'en_entrega')}>
            🚚 Enviar a entrega
          </button>
        )}
        {isEnEntrega && (
          <button className="btn btn-success btn-lg" style={{ minWidth: 180 }} onClick={() => onCambiar(pedido.id, 'entregado')}>
            ✅ Marcar entregado
          </button>
        )}
        {isEnEntrega && (
          <button className="btn btn-ghost btn-sm" onClick={() => onCambiar(pedido.id, 'listo')}>← Volver a listo</button>
        )}
      </div>
    </div>
  )
}
