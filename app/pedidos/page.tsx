'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { EstadoPedido } from '@/data/mock'

const ESTADOS: { val: EstadoPedido | 'todos'; label: string }[] = [
  { val: 'todos',          label: 'Todos'          },
  { val: 'confirmado',     label: 'Confirmado'     },
  { val: 'en_preparacion', label: 'En preparación' },
  { val: 'listo',          label: 'Listo'          },
  { val: 'en_entrega',     label: 'En entrega'     },
  { val: 'entregado',      label: 'Entregado'      },
  { val: 'cancelado',      label: 'Cancelado'      },
]

function fmt(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  )
}

function labelEstado(e: string) {
  const m: Record<string, string> = {
    confirmado: 'Confirmado', en_preparacion: 'En preparación',
    listo: 'Listo', en_entrega: 'En entrega', entregado: 'Entregado', cancelado: 'Cancelado',
  }
  return m[e] ?? e
}

export default function Pedidos() {
  const { pedidos, cancelarPedido } = useApp()
  const [estado,    setEstado]    = useState<EstadoPedido | 'todos'>('todos')
  const [busqueda,  setBusqueda]  = useState('')
  const [expandido, setExpandido] = useState<number | null>(null)

  const filtrados = pedidos.filter(p => {
    const matchE = estado === 'todos' || p.estado === estado
    const matchB = !busqueda || p.nombreCliente.toLowerCase().includes(busqueda.toLowerCase())
    return matchE && matchB
  })

  const totalFiltrado = filtrados.reduce((s, p) => s + p.total, 0)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Pedidos</div>
          <div className="page-sub">
            {filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''} ·
            click en una fila para ver el detalle
          </div>
        </div>
        {filtrados.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div className="form-label" style={{ marginBottom: 2 }}>Total filtrado</div>
            <div className="mono" style={{ fontWeight: 800, fontSize: 18 }}>
              ${totalFiltrado.toLocaleString('es-AR')}
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-col" style={{ flex: 1, minWidth: 180 }}>
            <label className="form-label">Buscar cliente</label>
            <input
              className="input"
              placeholder="Nombre del cliente…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <div className="form-col" style={{ minWidth: 180 }}>
            <label className="form-label">Estado</label>
            <select className="select" value={estado} onChange={e => setEstado(e.target.value as any)}>
              {ESTADOS.map(e => <option key={e.val} value={e.val}>{e.label}</option>)}
            </select>
          </div>
          {(busqueda || estado !== 'todos') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setBusqueda(''); setEstado('todos') }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-ico">📋</div>
            <div className="empty-title">Sin pedidos</div>
            <div className="empty-sub">No hay pedidos que coincidan con los filtros.</div>
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
                  <th>Ítems</th>
                  <th style={{ textAlign: 'right' }}>Kg</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
                          #{String(p.id).padStart(4, '0')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.nombreCliente}</td>
                      <td style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                        {fmt(p.fecha)}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {p.items.length} ítem{p.items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 13 }}>
                        {p.totalKg} kg
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                        ${p.total.toLocaleString('es-AR')}
                      </td>
                      <td>
                        <span className={`badge badge-${p.estado}`}>{labelEstado(p.estado)}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {(p.estado === 'confirmado' || p.estado === 'en_preparacion') && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (confirm(`¿Cancelar pedido de ${p.nombreCliente}? Se devolverá el stock.`))
                                cancelarPedido(p.id)
                            }}
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Fila de detalle expandible */}
                    {expandido === p.id && (
                      <tr key={`${p.id}-det`} className="expandida">
                        <td colSpan={8} style={{ padding: '14px 20px' }}>
                          <div className="form-label" style={{ marginBottom: 10 }}>
                            Detalle del pedido #{String(p.id).padStart(4, '0')}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 560 }}>
                            {p.items.map((it, i) => (
                              <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '7px 0', borderBottom: '1px solid var(--line)',
                                fontSize: 13,
                              }}>
                                <span style={{ fontWeight: 600 }}>{it.nombre}</span>
                                <span className="mono">
                                  {it.cantidad} kg × ${it.precioUnitario.toLocaleString('es-AR')}
                                  {' = '}
                                  <strong>${it.subtotal.toLocaleString('es-AR')}</strong>
                                </span>
                              </div>
                            ))}
                          </div>
                          {p.notas && (
                            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
                              📝 {p.notas}
                            </div>
                          )}
                          <div className="mono" style={{ marginTop: 10, textAlign: 'right', fontWeight: 800, fontSize: 15, maxWidth: 560 }}>
                            Total: ${p.total.toLocaleString('es-AR')} · {p.totalKg} kg
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
