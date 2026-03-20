'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { EstadoPedido } from '@/data/mock'

const ESTADOS: { val: EstadoPedido | 'todos'; label: string }[] = [
  { val: 'todos',         label: 'Todos'          },
  { val: 'confirmado',    label: 'Confirmado'      },
  { val: 'en_preparacion',label: 'En preparación'  },
  { val: 'listo',         label: 'Listo'           },
  { val: 'en_entrega',    label: 'En entrega'      },
  { val: 'entregado',     label: 'Entregado'       },
  { val: 'cancelado',     label: 'Cancelado'       },
]

function labelFecha(fechaEntrega: string): { texto: string; color: string } | null {
  if (!fechaEntrega) return null
  const hoy    = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (fechaEntrega < hoy)    return { texto: 'VENCIDO',   color: 'var(--red)'   }
  if (fechaEntrega === hoy)  return { texto: 'Hoy',       color: 'var(--amber)' }
  if (fechaEntrega === manana) return { texto: 'Mañana',  color: 'var(--green)' }
  return { texto: fechaEntrega, color: 'var(--muted)' }
}

export default function Pedidos() {
  const { pedidos, cancelarPedido } = useApp()

  const [busqueda,   setBusqueda]   = useState('')
  const [estadoFilt, setEstadoFilt] = useState<EstadoPedido | 'todos'>('todos')
  const [expandido,  setExpandido]  = useState<number | null>(null)
  const [filtroBaja, setFiltroBaja] = useState(false)

  const filtrados = pedidos.filter(p => {
    const matchE = estadoFilt === 'todos' || p.estado === estadoFilt
    const matchB = !busqueda || p.nombreCliente.toLowerCase().includes(busqueda.toLowerCase())
    return matchE && matchB
  })

  const totalFiltrado = filtrados.reduce((s, p) => s + p.total, 0)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Pedidos</div>
          <div className="page-sub">{filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''} · click en una fila para ver el detalle</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 2 }}>Total filtrado</div>
          <div className="mono" style={{ fontWeight: 800, fontSize: 22 }}>${totalFiltrado.toLocaleString('es-AR')}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 14 }}>
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
            <div className="empty-sub">{busqueda || estadoFilt !== 'todos' ? 'No hay resultados para ese filtro.' : 'Cargá el primer pedido.'}</div>
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
                  <th>Fecha pedido</th>
                  <th>Entrega</th>
                  <th style={{ textAlign: 'right' }}>Ítems</th>
                  <th style={{ textAlign: 'right' }}>Kg</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const isExp = expandido === p.id
                  const fLabel = labelFecha(p.fechaEntrega ?? '')
                  const cancelable = !['cancelado', 'entregado'].includes(p.estado)
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
                          {fLabel ? (
                            <span style={{ fontWeight: 700, fontSize: 12, color: fLabel.color }}>{fLabel.texto}</span>
                          ) : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: 13 }}>{p.items.length}</td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: 13 }}>{p.totalKg}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>${p.total.toLocaleString('es-AR')}</td>
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
                          <td colSpan={9} style={{ padding: '0 16px 16px', background: 'var(--blue-s)' }}>
                            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                              {/* Dirección y notas */}
                              {p.notas && (
                                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
                                  📝 {p.notas}
                                </div>
                              )}
                              {/* Ítems */}
                              {p.items.map((it, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < p.items.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 13 }}>
                                  <span style={{ fontWeight: 600 }}>{it.nombre}</span>
                                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <span className="mono">{it.cantidad} kg</span>
                                    <span className="mono" style={{ color: 'var(--muted)' }}>${it.precioUnitario.toLocaleString('es-AR')}/kg</span>
                                    <span className="mono" style={{ fontWeight: 700 }}>${it.subtotal.toLocaleString('es-AR')}</span>
                                  </div>
                                </div>
                              ))}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px', borderTop: '1px solid var(--line)', fontWeight: 800 }}>
                                <span className="mono">Total: ${p.total.toLocaleString('es-AR')}</span>
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
