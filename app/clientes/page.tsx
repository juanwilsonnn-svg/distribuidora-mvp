'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { precioParaCliente } from '@/context/AppContext'
import type { Producto } from '@/data/mock'

type Linea = { producto: Producto; cantidad: string }

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function mananaStr() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
}

export default function NuevaOrden() {
  const router = useRouter()
  const { clientes, productos, crearPedido } = useApp()

  const [clienteId,     setClienteId]     = useState<number | null>(null)
  const [busqCliente,   setBusqCliente]   = useState('')
  const [dropCliente,   setDropCliente]   = useState(false)
  const [fechaEntrega,  setFechaEntrega]  = useState(mananaStr)
  const [busqProd,      setBusqProd]      = useState('')
  const [focusProd,     setFocusProd]     = useState(false)
  const [gridCursor,    setGridCursor]    = useState(0)
  const [lineas,        setLineas]        = useState<Linea[]>([])
  const [notas,         setNotas]         = useState('')
  const [error,         setError]         = useState('')
  const [ok,            setOk]            = useState(false)
  const [toast,         setToast]         = useState<string | null>(null)

  const clienteInputRef = useRef<HTMLInputElement>(null)
  const prodInputRef    = useRef<HTMLInputElement>(null)
  const cantRefs        = useRef<(HTMLInputElement | null)[]>([])
  const gridRef         = useRef<HTMLDivElement>(null)
  const clienteRef      = useRef<HTMLDivElement>(null)

  const clienteSelec = clientes.find(c => c.id === clienteId)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!gridRef.current?.contains(e.target as Node))    setFocusProd(false)
      if (!clienteRef.current?.contains(e.target as Node)) setDropCliente(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => { setGridCursor(0) }, [busqProd])

  const clientesFilt = clientes.filter(c =>
    !busqCliente ||
    c.nombre.toLowerCase().includes(busqCliente.toLowerCase()) ||
    c.telefono.includes(busqCliente)
  )

  const seleccionarCliente = (id: number) => {
    setClienteId(id)
    setBusqCliente('')
    setDropCliente(false)
    const cli = clientes.find(c => c.id === id)
    if (cli) {
      setLineas(prev => prev.map(l => ({ ...l, producto: { ...l.producto } })))
    }
    setTimeout(() => prodInputRef.current?.focus(), 80)
  }

  const idsEnLinea = lineas.map(l => l.producto.id)
  const prodsFilt  = productos.filter(p =>
    !idsEnLinea.includes(p.id) &&
    (!busqProd || p.nombre.toLowerCase().includes(busqProd.toLowerCase()))
  )
  const categorias      = Array.from(new Set(prodsFilt.map(p => p.categoria)))
  const prodsNavegables = prodsFilt.filter(p => p.stock > 0)

  const agregarLinea = useCallback((p: Producto) => {
    if (p.stock <= 0) return
    const idx = lineas.length
    setLineas(prev => [...prev, { producto: p, cantidad: '' }])
    setBusqProd('')
    setFocusProd(false)
    setToast(p.nombre)
    setTimeout(() => setToast(null), 1800)
    setTimeout(() => { cantRefs.current[idx]?.focus(); cantRefs.current[idx]?.select() }, 60)
  }, [lineas.length])

  const setCantidad = (idx: number, val: string) => {
    if (val !== '' && !/^\d*\.?\d{0,3}$/.test(val)) return
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, cantidad: val } : l))
  }

  const quitarLinea = (idx: number) => {
    setLineas(prev => prev.filter((_, i) => i !== idx))
    cantRefs.current.splice(idx, 1)
  }

  const onKeyCliente = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setDropCliente(false); return }
    if (e.key === 'Enter' && clientesFilt.length === 1) seleccionarCliente(clientesFilt[0].id)
  }

  const onKeyProd = (e: React.KeyboardEvent) => {
    if (!focusProd) { setFocusProd(true); return }
    const max = prodsNavegables.length - 1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setGridCursor(c => Math.min(c + 1, max)) }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setGridCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter')  { e.preventDefault(); if (prodsNavegables[gridCursor]) agregarLinea(prodsNavegables[gridCursor]) }
    else if (e.key === 'Escape') { setFocusProd(false) }
  }

  const onKeyCant = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      const next = cantRefs.current[idx + 1]
      if (next) { next.focus(); next.select() }
      else { prodInputRef.current?.focus(); setFocusProd(true) }
    }
  }

  const tipoPrecio = clienteSelec?.tipoPrecio ?? 'A'

  const totalPesos = lineas.reduce((s, l) => {
    const precio = precioParaCliente(l.producto, tipoPrecio)
    return s + (parseFloat(l.cantidad) || 0) * precio
  }, 0)
  const totalKg = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0), 0)

  type ErrLinea = null | 'invalida' | 'sin-stock'
  const errLineas: ErrLinea[] = lineas.map(l => {
    const c = parseFloat(l.cantidad)
    if (l.cantidad !== '' && (!c || c <= 0)) return 'invalida'
    if (c > l.producto.stock)               return 'sin-stock'
    return null
  })

  const puedeConfirmar =
    !!clienteId && !!fechaEntrega && lineas.length > 0 &&
    lineas.every(l => parseFloat(l.cantidad) > 0) &&
    errLineas.every(e => !e)

  const confirmar = () => {
    if (!clienteId || !puedeConfirmar) return
    setError('')
    const result = crearPedido(
      clienteId,
      lineas.map(l => ({
        productoId:     l.producto.id,
        nombre:         l.producto.nombre,
        cantidad:       parseFloat(l.cantidad),
        precioUnitario: precioParaCliente(l.producto, tipoPrecio),
      })),
      notas.trim(),
      fechaEntrega,
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
      <div className=
