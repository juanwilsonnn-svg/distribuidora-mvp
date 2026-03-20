'use client'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'

function tiempoAtras(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1)  return 'ahora'
  if (min < 60) return `hace ${min}min`
  const h = Math.floor(min / 60)
  return `hace ${h}h${min % 60 > 0 ? ` ${min % 60}min` : ''}`
}

function labelEstado(e: string) {
  const map: Record<string, string> = {
    confirmado: 'Confirmado', en_preparacion: 'En preparación',
    listo: 'Listo', en_entrega: 'En entrega', entregado: 'Entregado', cancelado: 'Cancelado',
  }
  return map[e] ?? e
}

export default function Dashboard() {
  const { pedidos, productos } = useApp()

  const confirmados = pedidos.filter(p => p.estado === 'confirmado')
  const enPrep      = pedidos.filter(p => p.estado === 'en_preparacion')
  const listos      = pedidos.filter(p => p.estado === 'listo')
  const stockBajo   = productos.filter(p => p.stock > 0 && p.stock <= p.stockMinimo)
  const sinStock    = productos.filter(p => p.stock <= 0)

  const recientes = pedidos.slice(0, 6)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Panel</div>
          <div className="page-sub">Vista general del sistema</div>
        </div>
        <Link href="/nueva-orden" className="btn btn-primary btn-lg">
          + Nueva orden
        </Link>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Para preparar</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{confirmados.length}</div>
          <div className="stat-sub">confirmados sin iniciar</div>
        </div>
        <div className="stat">
          <div className="stat-label">En preparación</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{enPrep.length}</div>
          <div className="stat-sub">siendo armados</div>
        </div>
        <div className="stat">
          <div className="stat-label">Listos</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{listos.length}</div>
          <div className="stat-sub">para despacho</div>
        </div>
        <div className="stat">
          <div className="stat-label">Stock bajo</div>
          <div className="stat-value" style={{ color: sinStock.length > 0 ? 'var(--red)' : 'var(--amber)' }}>
            {sinStock.length + stockBajo.length}
          </div>
          <div className="stat-sub">
            {sinStock.length > 0 ? `${sinStock.length} sin stock` : 'productos a reponer'}
          </div>
        </div>
      </div>

      {/* Alertas */}
      {sinStock.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>
          <span>⛔</span>
          <span>
            <strong>Sin stock:</strong>{' '}
            {sinStock.map(p => p.nombre).join(', ')}
          </span>
        </div>
      )}
      {stockBajo.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          <span>⚠️</span>
          <span>
            <strong>Stock bajo:</strong>{' '}
            {stockBajo.map(p => `${p.nombre} (${p.stock} kg)`).join(', ')}
          </span>
        </div>
      )}

      <div className="g2" style={{ alignItems: 'start' }}>
        {/* Accesos rápidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/deposito" style={{ textDecoration: 'none' }}>
            <div className="card card-body" style={{ padding: 20, cursor: 'pointer', transition: 'box-shadow .15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--sh-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🏭</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Vista depósito</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {confirmados.length + enPrep.length} pedido{confirmados.length + enPrep.length !== 1 ? 's' : ''} en cola
              </div>
            </div>
          </Link>

          {/* Stock rápido */}
          <div className="card">
            <div className="card-head">Stock actual</div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {productos.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 16px', borderBottom: '1px solid var(--line-2)', fontSize: 13,
                }}>
                  <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                  <span className={`mono ${p.stock <= 0 ? 'c-zero' : p.stock <= p.stockMinimo ? 'c-low' : 'c-ok'}`}>
                    {p.stock} kg
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card">
          <div className="card-head">Actividad reciente</div>
          {recientes.length === 0 ? (
            <div className="empty" style={{ padding: 32 }}>
              <div className="empty-sub">Sin pedidos aún. ¡Cargá el primero!</div>
            </div>
          ) : (
            <div>
              {recientes.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 18px', borderBottom: '1px solid var(--line-2)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nombreCliente}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      <span className="mono" style={{ marginRight: 8, color: 'var(--muted)' }}>
                        #{String(p.id).padStart(4, '0')}
                      </span>
                      {tiempoAtras(p.fecha)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <span className={`badge badge-${p.estado}`}>{labelEstado(p.estado)}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                      ${p.total.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
