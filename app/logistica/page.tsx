'use client'
import { useApp } from '@/context/AppContext'
import type { Pedido } from '@/data/mock'

function labelFecha(fechaEntrega: string): { texto: string; urgente: boolean; vencido: boolean } {
  const hoy    = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (fechaEntrega < hoy)    return { texto: `⚠ VENCIDO`,             urgente: true,  vencido: true  }
  if (fechaEntrega === hoy)  return { texto: `⚡ Hoy`,                 urgente: true,  vencido: false }
  if (fechaEntrega === manana) return { texto: `Mañana`,              urgente: false, vencido: false }
  return                            { texto: fechaEntrega,            urgente: false, vencido: false }
}

function tiempoAtras(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1)  return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h}h ${min % 60 > 0 ? ` ${min % 60}min` : ''}`
}

export default function Logistica() {
  const { pedidos, clientes, cambiarEstado } = useApp()

  const listos    = pedidos
    .filter(p => p.estado === 'listo')
    .sort((a, b) => (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? ''))
  const enEntrega = pedidos
    .filter(p => p.estado === 'en_entrega')
    .sort((a, b) => (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? ''))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Logística</div>
          <div className="page-sub">{listos.length} para despachar · {enEntrega.length} en camino</div>
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
            No hay pedidos listos para despachar.<br />
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
            No hay pedidos en camino ahora.
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

          {/* Dirección y teléfono del cliente */}
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
