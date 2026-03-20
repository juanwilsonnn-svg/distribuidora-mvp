'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import type { EstadoPedido } from '@/data/mock'

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

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function haceNDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}

type RangoFecha = 'hoy' | '7d' | '30d' | 'todo' | 'custom'

export default function Dashboard() {
  const { pedidos, productos } = useApp()

  const [rango,     setRango]     = useState<RangoFecha>('todo')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const confirmados = pedidos.filter(p => p.estado === 'confirmado')
  const enPrep      = pedidos.filter(p => p.estado === 'en_preparacion')
  const listos      = pedidos.filter(p => p.estado === 'listo')
  const stockBajo   = productos.filter(p => p.stock > 0 && p.stock <= p.stockMinimo)
  const sinStock    = productos.filter(p => p.stock <= 0)

  // Actividad filtrada por rango de fecha
  const desde = rango === 'hoy'   ? hoyStr()
              : rango === '7d'    ? haceNDias(7)
              : rango === '30d'   ? haceNDias(30)
              : rango === 'custom' ? fechaDesde
              : null

  const hasta = rango === 'custom' ? fechaHasta : null

  const actividadFilt = pedidos.filter(p => {
    const fechaPedido = p.fecha.slice(0, 10)
    if (desde && fechaPedido < desde) return false
    if (hasta && fechaPedido > hasta) return false
    return true
  })

  // Stock ordenado de menor a mayor
  const stockOrdenado = [...productos].sort((a, b) => a.stock - b.stock)

  // Stats del período filtrado
  const totalVentasFilt = actividadFilt
    .filter(p => p.estado === 'entregado')
    .reduce((s, p) => s + p.total, 0)
  const pedidosEntregados = actividadFilt.filter(p => p.estado === 'entregado').length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Panel</div>
          <div className="page-sub">Vista general del sistema</div>
        </div>
        <Link href="/nueva-orden" className="btn btn-primary btn-lg">+ Nueva orden</Link>
      </div>

      {/* Stats operativos (siempre actuales, sin filtro) */}
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
          <div className="stat-sub">{sinStock.length > 0 ? `${sinStock.length} sin stock` : 'productos a reponer'}</div>
        </div>
      </div>

      {/* Alertas */}
      {sinStock.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 14 }}>
          <span>⛔</span>
          <span><strong>Sin stock:</strong> {sinStock.map(p => p.nombre).join(', ')}</span>
        </div>
      )}
      {stockBajo.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          <span>⚠️</span>
          <span><strong>Stock bajo:</strong> {stockBajo.map(p => `${p.nombre} (${p.stock} ${p.unidad === 'unidad' ? 'u.' : 'kg'})`).join(', ')}</span>
        </div>
      )}

      {/* Filtro de período */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Actividad:</span>
          {(['hoy', '7d', '30d', 'todo', 'custom'] as RangoFecha[]).map(r => (
            <button key={r} onClick={() => setRango(r)} style={{
              padding: '5px 12px', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
              background: rango === r ? 'var(--ink)' : 'var(--line)',
              color: rango === r ? '#fff' : 'var(--ink-3)', transition: 'all .12s',
            }}>
              {r === 'hoy' ? 'Hoy' : r === '7d' ? 'Últimos 7 días' : r === '30d' ? 'Últimos 30 días' : r === 'todo' ? 'Todo' : 'Rango'}
            </button>
          ))}
          {rango === 'custom' && (
            <>
              <input type="date" className="input mono" style={{ width: 150 }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>→</span>
              <input type="date" className="input mono" style={{ width: 150 }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </>
          )}
          {rango !== 'todo' && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
              {actividadFilt.length} pedido{actividadFilt.length !== 1 ? 's' : ''}
              {pedidosEntregados > 0 && ` · $${totalVentasFilt.toLocaleString('es-AR')} entregados`}
            </span>
          )}
        </div>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        {/* Columna izquierda */}
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

          {/* Stock ordenado de menor a mayor */}
          <div className="card">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Stock actual</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>↑ menor a mayor</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {stockOrdenado.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 16px', borderBottom: '1px solid var(--line-2)', fontSize: 13,
                }}>
                  <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                  <span className={`mono ${p.stock <= 0 ? 'c-zero' : p.stock <= p.stockMinimo ? 'c-low' : 'c-ok'}`}>
                    {p.stock} {p.unidad === 'unidad' ? 'u.' : 'kg'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actividad filtrada */}
        <div className="card">
          <div className="card-head">
            Actividad
            {rango !== 'todo' && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>
              {rango === 'hoy' ? '· hoy' : rango === '7d' ? '· últimos 7 días' : rango === '30d' ? '· últimos 30 días' : '· rango seleccionado'}
            </span>}
          </div>
          {actividadFilt.length === 0 ? (
            <div className="empty" style={{ padding: 32 }}>
              <div className="empty-sub">Sin pedidos en este período.</div>
            </div>
          ) : (
            <div>
              {actividadFilt.slice(0, 20).map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 18px', borderBottom: '1px solid var(--line-2)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nombreCliente}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      <span className="mono" style={{ marginRight: 8 }}>#{String(p.id).padStart(4, '0')}</span>
                      {tiempoAtras(p.fecha)}
                      {p.fechaEntrega && <span style={{ marginLeft: 8 }}>· entrega {p.fechaEntrega}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <span className={`badge badge-${p.estado}`}>{labelEstado(p.estado)}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      ${p.total.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              ))}
              {actividadFilt.length > 20 && (
                <div style={{ padding: '10px 18px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                  Mostrando 20 de {actividadFilt.length} pedidos · <Link href="/pedidos" style={{ color: 'var(--blue)' }}>Ver todos</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
