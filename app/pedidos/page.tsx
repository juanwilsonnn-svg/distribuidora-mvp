'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { EstadoPedido, Pedido } from '@/data/mock'

type RangoFecha = 'hoy' | '7d' | '30d' | 'todo' | 'custom'

const ESTADOS: { val: EstadoPedido | 'todos'; label: string }[] = [
  { val: 'todos',          label: 'Todos'          },
  { val: 'confirmado',     label: 'Confirmado'      },
  { val: 'en_preparacion', label: 'En preparación'  },
  { val: 'listo',          label: 'Listo'           },
  { val: 'en_entrega',     label: 'En entrega'      },
  { val: 'entregado',      label: 'Entregado'       },
  { val: 'cancelado',      label: 'Cancelado'       },
]

function labelFecha(fe: string): { texto: string; color: string } | null {
  if (!fe) return null
  const hoy    = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (fe < hoy)    return { texto: 'VENCIDO', color: 'var(--red)'   }
  if (fe === hoy)  return { texto: 'Hoy',     color: 'var(--amber)' }
  if (fe === manana) return { texto: 'Mañana', color: 'var(--green)' }
  return { texto: fe, color: 'var(--muted)' }
}

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function haceNDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}

// ── Exportar Pedidos a CSV ────────────────────────────────────────────────────
function exportarPedidosCSV(
  pedidos: Pedido[],
  productos: ReturnType<typeof useApp>['productos'],
  labelRango: string
) {
  const filas: string[][] = []

  filas.push([`KUKUI — Resumen de ventas`])
  filas.push([`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`])
  filas.push([`Período: ${labelRango}`])
  filas.push([])

  // Encabezados
  filas.push(['#', 'Cliente', 'Fecha', 'Entrega', 'Estado', 'Producto', 'Cantidad', 'Precio venta', 'Costo unit.', 'Subtotal venta', 'Subtotal costo', 'Margen ítem', 'Total pedido', 'Notas'])

  let totalVenta  = 0
  let totalCosto  = 0

  for (const p of pedidos) {
    if (p.items.length === 0) continue

    const fechaStr = new Date(p.fecha).toLocaleDateString('es-AR')

    p.items.forEach((it, i) => {
      const prod        = productos.find(pr => pr.id === it.productoId)
      const costoUnit   = prod?.precioCosto ?? 0
      const subtotalCosto = Math.round(costoUnit * it.cantidad * 100) / 100
      const margenItem  = it.subtotal - subtotalCosto
      const margenPct   = it.subtotal > 0 ? Math.round((margenItem / it.subtotal) * 100) : 0

      totalVenta  += i === 0 ? 0 : 0  // acumulo abajo
      totalCosto  += subtotalCosto

      filas.push([
        i === 0 ? `#${String(p.id).padStart(4, '0')}` : '',
        i === 0 ? p.nombreCliente : '',
        i === 0 ? fechaStr : '',
        i === 0 ? (p.fechaEntrega ?? '') : '',
        i === 0 ? p.estado : '',
        it.nombre,
        String(it.cantidad),
        `$${it.precioUnitario.toLocaleString('es-AR')}`,
        costoUnit > 0 ? `$${costoUnit.toLocaleString('es-AR')}` : '—',
        `$${it.subtotal.toLocaleString('es-AR')}`,
        costoUnit > 0 ? `$${subtotalCosto.toLocaleString('es-AR')}` : '—',
        costoUnit > 0 ? `${margenPct}%` : '—',
        i === 0 ? `$${p.total.toLocaleString('es-AR')}` : '',
        i === 0 ? p.notas : '',
      ])
    })

    totalVenta += p.total
    filas.push([])
  }

  // Totales
  const totalMargen = totalVenta - totalCosto
  const margenPct   = totalVenta > 0 ? Math.round((totalMargen / totalVenta) * 100) : 0
  filas.push([])
  filas.push(['', '', '', '', '', '', '', '', 'TOTAL VENTA', `$${totalVenta.toLocaleString('es-AR')}`, '', '', '', ''])
  filas.push(['', '', '', '', '', '', '', '', 'TOTAL COSTO', `$${totalCosto.toLocaleString('es-AR')}`, '', '', '', ''])
  filas.push(['', '', '', '', '', '', '', '', 'MARGEN NETO', `$${totalMargen.toLocaleString('es-AR')} (${margenPct}%)`, '', '', '', ''])

  const bom = '\uFEFF'
  const csv = bom + filas.map(f =>
    f.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')
  ).join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `kukui-ventas-${hoyStr()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Pedidos() {
  const { pedidos, productos, cancelarPedido } = useApp()

  const [busqueda,   setBusqueda]   = useState('')
  const [estadoFilt, setEstadoFilt] = useState<EstadoPedido | 'todos'>('todos')
  const [expandido,  setExpandido]  = useState<number | null>(null)
  const [rango,      setRango]      = useState<RangoFecha>('todo')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Filtro por fecha de creación del pedido
  const desde = rango === 'hoy'    ? hoyStr()
              : rango === '7d'     ? haceNDias(7)
              : rango === '30d'    ? haceNDias(30)
              : rango === 'custom' ? fechaDesde
              : null
  const hasta = rango === 'custom' ? fechaHasta : rango === 'hoy' ? hoyStr() : null

  const filtrados = pedidos.filter(p => {
    const matchE = estadoFilt === 'todos' || p.estado === estadoFilt
    const matchB = !busqueda || p.nombreCliente.toLowerCase().includes(busqueda.toLowerCase())
    const fechaP = p.fecha.slice(0, 10)
    const matchD = !desde || fechaP >= desde
    const matchH = !hasta || fechaP <= hasta
    return matchE && matchB && matchD && matchH
  })

  // Totales del filtro actual
  const totalVenta = filtrados.reduce((s, p) => s + p.total, 0)
  const totalCosto = filtrados.reduce((s, p) =>
    s + p.items.reduce((si, it) => {
      const prod = productos.find(pr => pr.id === it.productoId)
      return si + (prod?.precioCosto ?? 0) * it.cantidad
    }, 0)
  , 0)
  const margenNeto = totalVenta - totalCosto
  const margenPct  = totalVenta > 0 ? Math.round((margenNeto / totalVenta) * 100) : 0
  const tieneCostos = filtrados.some(p => p.items.some(it => {
    const prod = productos.find(pr => pr.id === it.productoId)
    return (prod?.precioCosto ?? 0) > 0
  }))

  const labelRango = rango === 'hoy' ? 'Hoy ' + hoyStr()
    : rango === '7d'  ? 'Últimos 7 días'
    : rango === '30d' ? 'Últimos 30 días'
    : rango === 'custom' ? `${fechaDesde} → ${fechaHasta}`
    : 'Todos'

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Pedidos</div>
          <div className="page-sub">{filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''} · click en una fila para ver el detalle</div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => exportarPedidosCSV(filtrados, productos, labelRango)}
          disabled={filtrados.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          📥 Exportar a Excel
        </button>
      </div>

      {/* Totales del período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="stat">
          <div className="stat-label">Venta total</div>
          <div className="stat-value mono" style={{ color: 'var(--blue)', fontSize: 26 }}>${totalVenta.toLocaleString('es-AR')}</div>
          <div className="stat-sub">{filtrados.filter(p => p.estado !== 'cancelado').length} pedidos</div>
        </div>
        {tieneCostos && (
          <>
            <div className="stat">
              <div className="stat-label">Costo estimado</div>
              <div className="stat-value mono" style={{ color: 'var(--muted)', fontSize: 26 }}>${totalCosto.toLocaleString('es-AR')}</div>
              <div className="stat-sub">basado en costo actual</div>
            </div>
            <div className="stat">
              <div className="stat-label">Margen neto</div>
              <div className="stat-value mono" style={{ color: margenPct >= 25 ? 'var(--green)' : margenPct >= 10 ? 'var(--amber)' : 'var(--red)', fontSize: 26 }}>
                ${margenNeto.toLocaleString('es-AR')}
              </div>
              <div className="stat-sub">{margenPct}% sobre venta</div>
            </div>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 14, alignItems: 'center' }}>
          {/* Filtro de período */}
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Período:</span>
          {(['hoy', '7d', '30d', 'todo', 'custom'] as RangoFecha[]).map(r => (
            <button key={r} onClick={() => setRango(r)} style={{
              padding: '5px 10px', borderRadius: 'var(--r)', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)',
              background: rango === r ? 'var(--ink)' : 'var(--line)',
              color: rango === r ? '#fff' : 'var(--ink-3)', transition: 'all .12s',
            }}>
              {r === 'hoy' ? 'Hoy' : r === '7d' ? '7 días' : r === '30d' ? '30 días' : r === 'todo' ? 'Todo' : 'Rango'}
            </button>
          ))}
          {rango === 'custom' && (
            <>
              <input type="date" className="input mono" style={{ width: 140 }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
              <input type="date" className="input mono" style={{ width: 140 }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </>
          )}
        </div>
        <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '0 14px 14px', alignItems: 'center', borderTop: '1px solid var(--line-2)' }}>
          <input
            className="input" style={{ flex: 2, minWidth: 180 }}
            placeholder="Buscar cliente…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
          />
          <select
            className="select" style={{ flex: 1, minWidth: 150 }}
            value={estadoFilt}
            onChange={e => setEstadoFilt(e.target.value as EstadoPedido | 'todos')}
          >
            {ESTADOS.map(e => <option key={e.val} value={e.val}>{e.label}</option>)}
          </select>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-ico">📋</div>
            <div className="empty-title">Sin pedidos</div>
            <div className="empty-sub">{busqueda || estadoFilt !== 'todos' || rango !== 'todo' ? 'No hay resultados para ese filtro.' : 'Cargá el primer pedido.'}</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Entrega</th>
                  <th style={{ textAlign: 'right' }}>Ítems</th>
                  <th style={{ textAlign: 'right' }}>Kg</th>
                  <th style={{ textAlign: 'right' }}>Venta</th>
                  {tieneCostos && <th style={{ textAlign: 'right' }}>Margen</th>}
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const isExp      = expandido === p.id
                  const fLabel     = labelFecha(p.fechaEntrega ?? '')
                  const cancelable = !['cancelado', 'entregado'].includes(p.estado)
                  const costoPedido = p.items.reduce((s, it) => {
                    const prod = productos.find(pr => pr.id === it.productoId)
                    return s + (prod?.precioCosto ?? 0) * it.cantidad
                  }, 0)
                  const margenPedido = p.total - costoPedido
                  const margenPctP   = p.total > 0 ? Math.round((margenPedido / p.total) * 100) : 0
                  const tieneCostoP  = costoPedido > 0

                  return (
                    <>
                      <tr key={p.id}
                        onClick={() => setExpandido(isExp ? null : p.id)}
                        style={{ cursor: 'pointer', background: isExp ? 'var(--blue-s)' : undefined }}
                      >
                        <td className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>#{String(p.id).padStart(4, '0')}</td>
                        <td style={{ fontWeight: 600 }}>{p.nombreCliente}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          {' '}
                          <span className="mono" style={{ fontSize: 11 }}>
                            {new Date(p.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          {fLabel
                            ? <span style={{ fontWeight: 700, fontSize: 12, color: fLabel.color }}>{fLabel.texto}</span>
                            : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: 13 }}>{p.items.length}</td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: 13 }}>{p.totalKg}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>${p.total.toLocaleString('es-AR')}</td>
                        {tieneCostos && (
                          <td style={{ textAlign: 'right' }}>
                            {tieneCostoP
                              ? <span style={{ fontWeight: 700, fontSize: 12, color: margenPctP >= 25 ? 'var(--green)' : margenPctP >= 10 ? 'var(--amber)' : 'var(--red)' }}>
                                  {margenPctP}%
                                </span>
                              : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                            }
                          </td>
                        )}
                        <td><span className={`badge badge-${p.estado}`}>{p.estado.replace('_', ' ')}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          {cancelable && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                if (confirm(`¿Cancelar pedido #${String(p.id).padStart(4,'0')} de ${p.nombreCliente}?\nTotal: $${p.total.toLocaleString('es-AR')}\n\nSe devolverá el stock. Esta acción no se puede deshacer.`))
                                  cancelarPedido(p.id)
                              }}
                            >Cancelar</button>
                          )}
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`exp-${p.id}`}>
                          <td colSpan={tieneCostos ? 10 : 9} style={{ padding: '0 16px 16px', background: 'var(--blue-s)' }}>
                            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                              {p.notas && (
                                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
                                  📝 {p.notas}
                                </div>
                              )}
                              {p.items.map((it, i) => {
                                const prod       = productos.find(pr => pr.id === it.productoId)
                                const costoUnit  = prod?.precioCosto ?? 0
                                const costoItem  = costoUnit * it.cantidad
                                const margenItem = it.subtotal - costoItem
                                const margenI    = it.subtotal > 0 ? Math.round((margenItem / it.subtotal) * 100) : 0
                                return (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < p.items.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 13 }}>
                                    <span style={{ fontWeight: 600 }}>{it.nombre}</span>
                                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                      <span className="mono">{it.cantidad} kg</span>
                                      <span className="mono" style={{ color: 'var(--muted)' }}>${it.precioUnitario.toLocaleString('es-AR')}/kg</span>
                                      <span className="mono" style={{ fontWeight: 700 }}>${it.subtotal.toLocaleString('es-AR')}</span>
                                      {costoUnit > 0 && (
                                        <span style={{ fontSize: 11, color: margenI >= 25 ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>
                                          margen {margenI}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
                                <span className="mono" style={{ fontWeight: 800 }}>Total: ${p.total.toLocaleString('es-AR')}</span>
                                {costoPedido > 0 && (
                                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                    Costo est.: ${Math.round(costoPedido).toLocaleString('es-AR')} · Margen: <strong style={{ color: margenPctP >= 25 ? 'var(--green)' : 'var(--amber)' }}>{margenPctP}%</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
