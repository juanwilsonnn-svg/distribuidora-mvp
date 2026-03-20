'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export default function Topbar() {
  const path = usePathname()
  const { pedidos, resetear } = useApp()

  const colaDeposito  = pedidos.filter(p => p.estado === 'confirmado' || p.estado === 'en_preparacion').length
  const colaLogistica = pedidos.filter(p => p.estado === 'listo' || p.estado === 'en_entrega').length

  const links = [
    { href: '/',            label: 'Panel'         },
    { href: '/nueva-orden', label: '+ Nueva orden' },
    { href: '/deposito',    label: 'Depósito',   badge: colaDeposito  },
    { href: '/logistica',   label: 'Logística',  badge: colaLogistica },
    { href: '/pedidos',     label: 'Pedidos'       },
    { href: '/clientes',    label: 'Clientes'      },
    { href: '/productos',   label: 'Productos'     },
  ]

  const handleReset = () => {
    if (confirm('¿Borrar todos los pedidos y restaurar los datos iniciales?\n\nEsto no se puede deshacer.')) {
      resetear()
    }
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
        <span className="saved-pill"><span className="saved-dot" />guardado</span>
        <button className="btn btn-reset" onClick={handleReset}>reset</button>
      </div>
    </header>
  )
}
