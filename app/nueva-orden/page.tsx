'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import type { Producto } from '@/data/mock'

type Linea = { producto: Producto; cantidad: string }

export default function NuevaOrden() {
  const router = useRouter()
  const { clientes, productos, crearPedido } = useApp()

  const [clienteId,  setClienteId]  = useState<number | null>(null)
  const [busqProd,   setBusqProd]   = useState('')
  const [focusProd,  setFocusProd]  = useState(false)   // grilla visible
  const [gridCursor, setGridCursor] = useState(0)
  const [lineas,     setLineas]     = useState<Linea[]>([])
  const [notas,      setNotas]      = useState('')
  const [error,      setError]      = useState('')
  const [ok,         setOk]         = useState(false)
  const [toast,      setToast]      = useState<string | null>(null)

  const prodInputRef = useRef<HTMLInputElement>(null)
  const cantRefs     = useRef<(HTMLInputElement | null)[]>([])
  const gridRef      = useRef<HTMLDivElement>(null)

  // Cerrar grilla al click fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!gridRef.current?.contains(e.target as Node)) setFocusProd(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => { setGridCursor(0) }, [busqProd])

  // ── Productos filtrados ──────────────────────────────────────────────────
  const idsEnLinea = lineas.map(l => l.producto.id)
  const prodsFilt  = productos.filter(p =>
    !idsEnLinea.includes(p.id) &&
    (!busqProd || p.nombre.toLowerCase().includes(busqProd.toLowerCase()))
  )

  // Agrupar por categoría para la grilla
  const categorias = Array.from(new Set(prodsFilt.map(p => p.categoria)))

  // Lista plana para navegación con teclado
  const prodsNavegables = prodsFilt.filter(p => p.stock > 0)

  // ── Acciones ─────────────────────────────────────────────────────────────
  const agregarLinea = useCallback((p: Producto) => {
    if (p.stock <= 0) return
    const idx = lineas.length
    setLineas(prev => [...prev, { producto: p, cantidad: '' }])
    setBusqProd('')
    setFocusProd(false)
    // Toast de confirmación
    setToast(p.nombre)
    setTimeout(() => setToast(null), 1800)
    setTimeout(() => {
      cantRefs.current[idx]?.focus()
      cantRefs.current[idx]?.select()
    }, 60)
  }, [lineas.length])

  const setCantidad = (idx: number, val: string) => {
    if (val !== '' && !/^\d*\.?\d{0,3}$/.test(val)) return
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, cantidad: val } : l))
  }

  const quitarLinea = (idx: number) => {
    setLineas(prev => prev.filter((_, i) => i !== idx))
    cantRefs.current.splice(idx, 1)
  }

  // ── Teclado en el buscador ────────────────────────────────────────────────
  const onKeyProd = (e: React.KeyboardEvent) => {
    if (!focusProd) { setFocusProd(true); return }
    const max = prodsNavegables.length - 1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault(); setGridCursor(c => Math.min(c + 1, max))
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault(); setGridCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (prodsNavegables[gridCursor]) agregarLinea(prodsNavegables[gridCursor])
    } else if (e.key === 'Escape') {
      setFocusProd(false)
    }
  }

  // Tab en cantidad → siguiente o buscador
  const onKeyCant = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      const next = cantRefs.current[idx + 1]
      if (next) { next.focus(); next.select() }
      else { prodInputRef.current?.focus(); setFocusProd(true) }
    }
  }

  // ── Totales ───────────────────────────────────────────────────────────────
  const totalPesos = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * l.producto.precio, 0)
  const totalKg    = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0), 0)

  type ErrLinea = null | 'invalida' | 'sin-stock'
  const errLineas: ErrLinea[] = lineas.map(l => {
    const c = parseFloat(l.cantidad)
    if (l.cantidad !== '' && (!c || c <= 0)) return 'invalida'
    if (c > l.producto.stock)               return 'sin-stock'
    return null
  })

  const puedeConfirmar =
    !!clienteId && lineas.length > 0 &&
    lineas.every(l => parseFloat(l.cantidad) > 0) &&
    errLineas.every(e => !e)

  // ── Confirmar ─────────────────────────────────────────────────────────────
  const confirmar = () => {
    if (!clienteId || !puedeConfirmar) return
    setError('')
    const result = crearPedido(
      clienteId,
      lineas.map(l => ({
        productoId:     l.producto.id,
        nombre:         l.producto.nombre,
        cantidad:       parseFloat(l.cantidad),
        precioUnitario: l.producto.precio,
      })),
      notas.trim(),
    )
    if (!result.ok) { setError(result.error ?? 'Error al crear el pedido.'); return }
    setOk(true)
    setTimeout(() => router.push('/deposito'), 900)
  }

  if (ok) return (
    <div className="page">
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Pedido confirmado</div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>Redirigiendo al depósito…</div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Nueva orden</div>
          <div className="page-sub">↑↓ navegar productos · Enter agregar · Tab pasar a cantidad</div>
        </div>
        {(clienteId || lineas.length > 0) && (
          <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>● Sin confirmar</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── 1. Cliente ─────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-head">1 · Cliente</div>
          <div className="card-body">
            <select
              className="select"
              value={clienteId ?? ''}
              onChange={e => setClienteId(e.target.value ? Number(e.target.value) : null)}
              autoFocus
            >
              <option value="">— Seleccioná un cliente —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} · {c.telefono}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 2. Productos ───────────────────────────────────────────── */}
        <div className="card">
          <div className="card-head">
            <span>2 · Productos</span>
            {lineas.length > 0 && (
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
                {lineas.length} ítem{lineas.length !== 1 ? 's' : ''} · {totalKg.toFixed(2)} kg
              </span>
            )}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Buscador */}
            <div ref={gridRef}>
              <div className="form-col" style={{ marginBottom: focusProd && prodsFilt.length > 0 ? 12 : 0 }}>
                <label className="form-label">Buscar o seleccionar producto</label>
                <input
                  ref={prodInputRef}
                  className="input"
                  placeholder="Escribí para filtrar, o presioná ↓ para ver todos…"
                  value={busqProd}
                  autoComplete="off"
                  onChange={e => { setBusqProd(e.target.value); setFocusProd(true) }}
                  onFocus={() => setFocusProd(true)}
                  onKeyDown={onKeyProd}
                />
              </div>

              {/* ── Grilla de productos — inline, sin scroll interno ── */}
              {focusProd && (
                <div style={{
                  border: '1.5px solid var(--blue-b)',
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--surface)',
                  padding: '4px 0 8px',
                }}>
                  {prodsFilt.length === 0 ? (
                    <div style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                      Sin resultados para "{busqProd}"
                    </div>
                  ) : (
                    <div>
                      <div style={{ padding: '6px 14px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', borderBottom: '1px solid var(--line-2)' }}>
                        {prodsFilt.length} disponible{prodsFilt.length !== 1 ? 's' : ''} · ↑↓ navegar · Enter seleccionar
                      </div>
                      {categorias.map(cat => {
                        const prodsCat = prodsFilt.filter(p => p.categoria === cat)
                        return (
                          <div key={cat}>
                            <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>
                              {cat}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6, padding: '0 10px 4px' }}>
                              {prodsCat.map(p => {
                                const sin  = p.stock <= 0
                                const bajo = !sin && p.stock <= p.stockMinimo
                                const navIdx = prodsNavegables.indexOf(p)
                                const highlighted = navIdx === gridCursor && !sin
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => !sin && agregarLinea(p)}
                                    style={{
                                      padding: '10px 12px',
                                      borderRadius: 'var(--r)',
                                      cursor: sin ? 'not-allowed' : 'pointer',
                                      background: highlighted ? 'var(--blue-s)' : sin ? 'var(--line-2)' : 'var(--line-2)',
                                      border: `1.5px solid ${highlighted ? 'var(--blue-b)' : 'transparent'}`,
                                      opacity: sin ? 0.45 : 1,
                                      transition: 'all .1s',
                                    }}
                                    onMouseEnter={() => { if (!sin) setGridCursor(navIdx) }}
                                  >
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.nombre}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: 11, color: sin ? 'var(--red)' : bajo ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>
                                        {sin ? 'Sin stock' : `${p.stock} kg${bajo ? ' ⚠' : ''}`}
                                      </span>
                                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                                        ${p.precio.toLocaleString('es-AR')}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Líneas del pedido ─────────────────────────────────── */}
            {lineas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 32px', gap: 8, padding: '0 4px' }}>
                  {(['Producto', 'kg', 'Subtotal', ''] as const).map((h, i) => (
                    <span key={i} className="form-label" style={{ textAlign: i === 1 || i === 2 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>

                {lineas.map((l, idx) => {
                  const c   = parseFloat(l.cantidad) || 0
                  const sub = c * l.producto.precio
                  const err = errLineas[idx]
                  return (
                    <div key={l.producto.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 100px 120px 32px',
                      gap: 8, alignItems: 'center',
                      padding: '10px 12px', borderRadius: 'var(--r)',
                      background: err ? 'var(--red-s)' : 'var(--line-2)',
                      border: `1px solid ${err ? 'var(--red-b)' : 'var(--line)'}`,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{l.producto.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          stock: {l.producto.stock} kg · ${l.producto.precio.toLocaleString('es-AR')}/kg
                        </div>
                        {err === 'sin-stock' && <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginTop: 2 }}>⚠ supera el stock disponible</div>}
                        {err === 'invalida'  && <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginTop: 2 }}>cantidad inválida</div>}
                      </div>
                      <input
                        ref={el => { cantRefs.current[idx] = el }}
                        type="number" min="0.001" step="0.1"
                        className={`input mono${err ? ' input-error' : ''}`}
                        style={{ textAlign: 'right' }}
                        placeholder="0.0"
                        value={l.cantidad}
                        onChange={e => setCantidad(idx, e.target.value)}
                        onKeyDown={e => onKeyCant(e, idx)}
                      />
                      <div className="mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                        {c > 0 ? `$${sub.toLocaleString('es-AR')}` : '—'}
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '5px 8px', fontSize: 14 }}
                        onClick={() => quitarLinea(idx)}
                      >✕</button>
                    </div>
                  )
                })}
              </div>
            )}

            {lineas.length === 0 && !focusProd && (
              <div
                style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}
                onClick={() => { prodInputRef.current?.focus(); setFocusProd(true) }}
              >
                Hacé click acá o en el buscador para agregar productos
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Notas ───────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-head">3 · Notas (opcional)</div>
          <div className="card-body">
            <textarea
              className="input"
              rows={2}
              placeholder="Instrucciones de entrega, observaciones…"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* ── Confirmar ─────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Total del pedido</div>
              <div className="mono" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }}>
                ${totalPesos.toLocaleString('es-AR')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>
                {lineas.length} producto{lineas.length !== 1 ? 's' : ''} · {totalKg.toFixed(2)} kg
              </div>
            </div>
            <button
              className="btn btn-success btn-xl"
              disabled={!puedeConfirmar}
              onClick={confirmar}
              style={{ minWidth: 210 }}
            >
              ✓ Confirmar pedido
            </button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ margin: '0 18px 16px' }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}
          {!clienteId && lineas.length > 0 && (
            <div className="alert alert-info" style={{ margin: '0 18px 16px' }}>
              <span>→</span><span>Seleccioná un cliente para poder confirmar.</span>
            </div>
          )}
        </div>

      </div>

      {/* Toast de confirmación */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff',
          padding: '10px 20px', borderRadius: 'var(--r-lg)',
          fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeInUp .2s ease',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#4ade80' }}>✓</span>
          {toast} agregado al pedido
        </div>
      )}
    </div>
  )
}
