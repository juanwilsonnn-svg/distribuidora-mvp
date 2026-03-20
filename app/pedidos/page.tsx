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

export default function Pedidos() {
  const { pedidos, productos, cancelarPedido } = useApp()

  const [busqueda, setBusqueda] = useState('')
  const [estadoFilt, setEstadoFilt] = useState<EstadoPedido | 'todos'>('todos')
  const [mostrarCancelados, setMostrarCancelados] = useState(false)
  const [expandido, setExpandido] = useState<number | null>(null)
  const [rango, setRango] = useState<RangoFecha>('todo')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const desde = rango === 'hoy' ? hoyStr()
    : rango === '7d' ? haceNDias(7)
    : rango === '30d' ? haceNDias(30)
    : rango === 'custom' ? fechaDesde
    : null

  const hasta = rango === 'custom' ? fechaHasta : rango === 'hoy' ? hoyStr() : null

  // 🔥 FILTRADO PRINCIPAL (sin cancelados por defecto)
  const filtrados = pedidos.filter(p => {
    if (!mostrarCancelados && p.estado === 'cancelado') return false

    const matchE = estadoFilt === 'todos' || p.estado === estadoFilt
    const matchB = !busqueda || p.nombreCliente.toLowerCase().includes(busqueda.toLowerCase())
    const fechaP = p.fecha.slice(0, 10)
    const matchD = !desde || fechaP >= desde
    const matchH = !hasta || fechaP <= hasta

    return matchE && matchB && matchD && matchH
  })

  // 🔥 MÉTRICAS CORRECTAS
  const pedidosValidos = filtrados.filter(p => p.estado !== 'cancelado')

  const totalVenta = pedidosValidos.reduce((s, p) => s + p.total, 0)

  const totalCosto = pedidosValidos.reduce((s, p) =>
    s + p.items.reduce((si, it) => {
      const prod = productos.find(pr => pr.id === it.productoId)
      return si + (prod?.precioCosto ?? 0) * it.cantidad
    }, 0)
  , 0)

  const margenNeto = totalVenta - totalCosto
  const margenPct  = totalVenta > 0 ? Math.round((margenNeto / totalVenta) * 100) : 0

  const tieneCostos = pedidosValidos.some(p => p.items.some(it => {
    const prod = productos.find(pr => pr.id === it.productoId)
    return (prod?.precioCosto ?? 0) > 0
  }))

  return (
    <div className="page">

      <div className="page-head">
        <div>
          <div className="page-title">Pedidos</div>
          <div className="page-sub">
            {pedidosValidos.length} pedidos activos
          </div>
        </div>
      </div>

      {/* 🔥 TOGGLE CANCELADOS */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={mostrarCancelados}
            onChange={() => setMostrarCancelados(prev => !prev)}
          />
          Mostrar cancelados
        </label>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div>Venta: ${totalVenta.toLocaleString('es-AR')}</div>
        <div>Costo: ${totalCosto.toLocaleString('es-AR')}</div>
        <div>Margen: {margenPct}%</div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Entrega</th>
            <th>Total</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {filtrados.map(p => (
            <tr key={p.id}>
              <td>#{p.id}</td>
              <td>{p.nombreCliente}</td>
              <td>{new Date(p.fecha).toLocaleDateString()}</td>
              <td>{p.fechaEntrega || '-'}</td>
              <td>${p.total.toLocaleString()}</td>
              <td>{p.estado}</td>

              <td>
                {!['cancelado','entregado'].includes(p.estado) && (
                  <button
                    onClick={() => {
                      if (confirm('Cancelar pedido?')) cancelarPedido(p.id)
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
