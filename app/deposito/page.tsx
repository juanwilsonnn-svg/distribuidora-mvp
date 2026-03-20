'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { EstadoPedido, Pedido } from '@/data/mock'

type Tab = 'todos' | 'confirmado' | 'en_preparacion'

function tiempoAtras(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1)  return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  return `hace ${h}h ${min % 60}min`
}

export default function Deposito() {
  const { pedidos, cambiarEstado, cancelarPedido } = useApp()
  const [tab, setTab] = useState<Tab>('todos')

  const activos = pedidos.filter(p =>
    ['confirmado', 'en_preparacion'].includes(p.estado)
  )

  const cuentas = {
    todos:          activos.length,
    confirmado:     activos.filter(p => p.estado === 'confirmado').length,
    en_preparacion: activos.filter(p => p.estado === 'en_preparacion').length,
  }

  const filtrados = tab === 'todos' ? activos : activos.filter(p => p.estado === tab)

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'todos',          label: 'Todos',          color: 'var(--ink)'   },
    { key: 'confirmado',     label: 'Para preparar',  color: 'var(--blue)'  },
    { key: 'en_preparacion', label: 'En preparación', color: 'var(--amber)' },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Depósito</div>
          <div className="page-sub">
            {activos.length} pedido{activos.length !== 1 ? 's' : ''} en cola
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 'var(--r)', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 700, fontSize: 13,
              background: tab === t.key ? 'var(--ink)' : 'var(--line)',
              color: tab === t.key ? '#fff' : 'var(--ink-3)',
              transition: 'all .13s',
            }}
          >
            {t.label}
            {cuentas[t.key] > 0 && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                background: tab === t.key ? 'rgba(255,255,255,.2)' : 'var(--muted)',
                color: '#fff', padding: '1px 7px', borderRadius: 20,
              }}>
                {cuentas[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="empty">
          <div className="empty-ico">✅</div>
          <div className="empty-title">Sin pedidos en esta vista</div>
          <div className="empty-sub">No hay nada en la cola ahora mismo.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtrados.map(p => (
            <DepCard
              key={p.id}
              pedido={p}
              onCambiar={cambiarEstado}
              onCancelar={cancelarPedido}
            />
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
  const barColor: Record<string, string> = {
    confirmado:     'var(--blue)',
    en_preparacion: 'var(--amber)',
    listo:          'var(--green)',
  }

  const handleCancelar = () => {
    if (confirm(`¿Cancelar el pedido de ${pedido.nombreCliente}?\nSe devolverá el stock.`)) {
      onCancelar(pedido.id)
    }
  }

  return (
    <div className="dep-card" style={{ borderLeft: `5px solid ${barColor[pedido.estado] ?? '#ccc'}` }}>
      {/* Cabecera */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '14px 18px 10px', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
            <span className="mono" style={{
              fontSize: 11, color: 'var(--muted)', background: 'var(--line-2)',
              padding: '2px 8px', borderRadius: 'var(--r)',
            }}>
              #{String(pedido.id).padStart(4, '0')}
            </span>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{pedido.nombreCliente}</span>
            <span className={`badge badge-${pedido.estado}`}>
              {pedido.estado.replace('_', ' ')}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12 }}>
            <span>{tiempoAtras(pedido.fecha)}</span>
            {pedido.notas && (
              <span style={{
                background: 'var(--amber-s)', color: 'var(--amber)',
                padding: '1px 8px', borderRadius: 4, fontWeight: 600,
              }}>
                📝 {pedido.notas}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="mono" style={{ fontWeight: 800, fontSize: 20 }}>
            ${pedido.total.toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{pedido.totalKg} kg</div>
        </div>
      </div>

      {/* Lista de ítems */}
      <div style={{ margin: '0 18px 14px', background: 'var(--line-2)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        {pedido.items.map((it, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 14px',
            borderBottom: i < pedido.items.length - 1 ? '1px solid var(--line)' : 'none',
            fontSize: 14,
          }}>
            <span style={{ fontWeight: 600 }}>{it.nombre}</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>
              {it.cantidad} kg
            </span>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div style={{ padding: '0 18px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {pedido.estado === 'confirmado' && (
          <>
            <button className="btn btn-amber btn-lg" onClick={() => onCambiar(pedido.id, 'en_preparacion')}>
              🔧 Iniciar preparación
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCancelar}>Cancelar</button>
          </>
        )}
        {pedido.estado === 'en_preparacion' && (
          <>
            <button className="btn btn-success btn-lg" onClick={() => onCambiar(pedido.id, 'listo')}>
              ✅ Marcar como listo
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCancelar}>Cancelar</button>
          </>
        )}
        {pedido.estado === 'listo' && (
          <button className="btn btn-primary btn-lg" onClick={() => onCambiar(pedido.id, 'entregado')}>
            🚚 Marcar como entregado
          </button>
        )}
      </div>
    </div>
  )
}
