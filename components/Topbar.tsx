'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export default function Topbar() {
  const path = usePathname()
  const { pedidos, resetear } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)

  const colaDeposito  = pedidos.filter(p => p.estado === 'confirmado' || p.estado === 'en_preparacion').length
  const colaLogistica = pedidos.filter(p => p.estado === 'listo'      || p.estado === 'en_entrega').length

  // Urgentes: pedidos activos con fecha de entrega hoy o vencida
  const hoy = new Date().toISOString().slice(0, 10)
  const urgentes = pedidos.filter(p =>
    !['cancelado', 'entregado'].includes(p.estado) &&
    p.fechaEntrega && p.fechaEntrega <= hoy
  ).length

  const links = [
    { href: '/',            label: 'Panel'       },
    { href: '/nueva-orden', label: '+ Nueva'     },
    { href: '/deposito',    label: 'Depósito',   badge: colaDeposito  },
    { href: '/logistica',   label: 'Logística',  badge: colaLogistica },
    { href: '/pedidos',     label: 'Pedidos'     },
    { href: '/clientes',    label: 'Clientes'    },
    { href: '/productos',   label: 'Productos'   },
  ]

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      setTimeout(() => setConfirmReset(false), 3000)
      return
    }
    resetear()
    setConfirmReset(false)
  }

  return (
    <header className="topbar">
      <Link href="/" className="topbar-logo">🌿 <span>Kukui</span></Link>

      {links.map(l => (
        <Link key={l.href} href={l.href} className={`nav-link${path === l.href ? ' active' : ''}`}>
          {l.label}
          {!!l.badge && <span className="nav-badge">{l.badge}</span>}
        </Link>
      ))}

      <div className="topbar-end">
        {urgentes > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'var(--red-s)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--red-b)' }}>
            ⚡ {urgentes} urgente{urgentes !== 1 ? 's' : ''}
          </span>
        )}
        <span className="saved-pill"><span className="saved-dot" />guardado</span>
        <button
          className="btn btn-reset"
          onClick={handleReset}
          style={confirmReset ? { background: 'var(--red)', color: '#fff' } : undefined}
          title={confirmReset ? 'Click de nuevo para confirmar' : 'Resetear datos'}
        >
          {confirmReset ? '¿Confirmar reset?' : 'reset'}
        </button>
      </div>
    </header>
  )
}
