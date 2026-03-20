'use client'
// context/AppContext.tsx — v3
// Agrega CRUD clientes, CRUD productos, estado en_entrega, schema bump a v3.

import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode,
} from 'react'
import {
  CLIENTES_SEED, PRODUCTOS_SEED, PEDIDOS_SEED,
  PROXIMO_ID_SEED, PROXIMO_CLIENTE_ID_SEED,
  type Cliente, type Producto, type Pedido,
  type ItemPedido, type EstadoPedido,
} from '@/data/mock'

const LS = {
  SCHEMA:             'distrib_schema',
  CLIENTES:           'distrib_clientes',
  PRODUCTOS:          'distrib_productos',
  PEDIDOS:            'distrib_pedidos',
  PROXIMO_ID:         'distrib_proximo_id',
  PROXIMO_CLIENTE_ID: 'distrib_proximo_cliente_id',
} as const
const SCHEMA_V = '3'

function lsRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function lsWrite<T>(key: string, val: T) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
function lsClear() { Object.values(LS).forEach(k => localStorage.removeItem(k)) }
function checkSchema() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(LS.SCHEMA) !== SCHEMA_V) { lsClear(); localStorage.setItem(LS.SCHEMA, SCHEMA_V) }
}

type NuevoCliente  = Omit<Cliente, 'id'>
type NuevoProducto = Omit<Producto, 'id'>

type Ctx = {
  clientes:  Cliente[]
  productos: Producto[]
  pedidos:   Pedido[]
  crearPedido:      (clienteId: number, items: Omit<ItemPedido, 'subtotal'>[], notas: string) => { ok: boolean; error?: string }
  cambiarEstado:    (id: number, estado: EstadoPedido) => void
  cancelarPedido:   (id: number) => void
  agregarCliente:   (c: NuevoCliente) => void
  editarCliente:    (id: number, cambios: NuevoCliente) => void
  eliminarCliente:  (id: number) => { ok: boolean; error?: string }
  agregarProducto:  (p: NuevoProducto) => void
  editarProducto:   (id: number, cambios: NuevoProducto) => void
  ajustarStock:     (id: number, nuevoStock: number) => void
  eliminarProducto: (id: number) => { ok: boolean; error?: string }
  resetear:         () => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [clientes,  setClientes]  = useState<Cliente[]>(() => { checkSchema(); return lsRead(LS.CLIENTES, CLIENTES_SEED) })
  const [productos, setProductos] = useState<Producto[]>(() => lsRead(LS.PRODUCTOS, PRODUCTOS_SEED))
  const [pedidos,   setPedidos]   = useState<Pedido[]>(()   => lsRead(LS.PEDIDOS,   PEDIDOS_SEED))
  const [proximoId,         setProximoId]         = useState<number>(() => lsRead(LS.PROXIMO_ID,         PROXIMO_ID_SEED))
  const [proximoClienteId,  setProximoClienteId]  = useState<number>(() => lsRead(LS.PROXIMO_CLIENTE_ID, PROXIMO_CLIENTE_ID_SEED))

  useEffect(() => { lsWrite(LS.CLIENTES,           clientes)         }, [clientes])
  useEffect(() => { lsWrite(LS.PRODUCTOS,          productos)        }, [productos])
  useEffect(() => { lsWrite(LS.PEDIDOS,            pedidos)          }, [pedidos])
  useEffect(() => { lsWrite(LS.PROXIMO_ID,         proximoId)        }, [proximoId])
  useEffect(() => { lsWrite(LS.PROXIMO_CLIENTE_ID, proximoClienteId) }, [proximoClienteId])

  // ── Pedidos ───────────────────────────────────────────────────────────────
  const crearPedido = useCallback((
    clienteId: number, itemsRaw: Omit<ItemPedido, 'subtotal'>[], notas: string,
  ): { ok: boolean; error?: string } => {
    for (const it of itemsRaw) {
      const prod = productos.find(p => p.id === it.productoId)
      if (!prod)             return { ok: false, error: `Producto "${it.nombre}" no encontrado.` }
      if (it.cantidad <= 0)  return { ok: false, error: `Cantidad inválida en "${it.nombre}".` }
      if (it.cantidad > prod.stock) return { ok: false, error: `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock} kg.` }
    }
    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente) return { ok: false, error: 'Cliente no encontrado.' }
    const items: ItemPedido[] = itemsRaw.map(it => ({ ...it, subtotal: Math.round(it.cantidad * it.precioUnitario * 100) / 100 }))
    const total   = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100
    const totalKg = Math.round(items.reduce((s, i) => s + i.cantidad, 0) * 100) / 100
    const nuevo: Pedido = { id: proximoId, clienteId, nombreCliente: cliente.nombre, fecha: new Date().toISOString(), estado: 'confirmado', items, total, totalKg, notas }
    setProductos(prev => prev.map(p => { const it = itemsRaw.find(i => i.productoId === p.id); return it ? { ...p, stock: Math.round((p.stock - it.cantidad) * 100) / 100 } : p }))
    setPedidos(prev => [nuevo, ...prev])
    setProximoId(n => n + 1)
    return { ok: true }
  }, [clientes, productos, proximoId])

  const cambiarEstado = useCallback((id: number, estado: EstadoPedido) => {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
  }, [])

  const cancelarPedido = useCallback((id: number) => {
    const pedido = pedidos.find(p => p.id === id)
    if (!pedido || pedido.estado === 'cancelado' || pedido.estado === 'entregado') return
    setProductos(prev => prev.map(p => { const it = pedido.items.find(i => i.productoId === p.id); return it ? { ...p, stock: Math.round((p.stock + it.cantidad) * 100) / 100 } : p }))
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: 'cancelado' } : p))
  }, [pedidos])

  // ── Clientes ──────────────────────────────────────────────────────────────
  const agregarCliente = useCallback((c: NuevoCliente) => {
    setClientes(prev => [...prev, { id: proximoClienteId, ...c }])
    setProximoClienteId(n => n + 1)
  }, [proximoClienteId])

  const editarCliente = useCallback((id: number, cambios: NuevoCliente) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...cambios } : c))
    setPedidos(prev => prev.map(p => p.clienteId === id ? { ...p, nombreCliente: cambios.nombre } : p))
  }, [])

  const eliminarCliente = useCallback((id: number): { ok: boolean; error?: string } => {
    const activos = pedidos.filter(p => p.clienteId === id && !['cancelado', 'entregado'].includes(p.estado))
    if (activos.length > 0) return { ok: false, error: 'El cliente tiene pedidos activos. Finalizalos o cancelalos primero.' }
    setClientes(prev => prev.filter(c => c.id !== id))
    return { ok: true }
  }, [pedidos])

  // ── Productos ─────────────────────────────────────────────────────────────
  const agregarProducto = useCallback((p: NuevoProducto) => {
    setProductos(prev => { const maxId = prev.reduce((m, x) => Math.max(m, x.id), 0); return [...prev, { id: maxId + 1, ...p }] })
  }, [])

  const editarProducto = useCallback((id: number, cambios: NuevoProducto) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...cambios } : p))
  }, [])

  const ajustarStock = useCallback((id: number, nuevoStock: number) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, Math.round(nuevoStock * 100) / 100) } : p))
  }, [])

  const eliminarProducto = useCallback((id: number): { ok: boolean; error?: string } => {
    const enUso = pedidos.some(p => !['cancelado', 'entregado'].includes(p.estado) && p.items.some(i => i.productoId === id))
    if (enUso) return { ok: false, error: 'El producto está en pedidos activos. No se puede eliminar.' }
    setProductos(prev => prev.filter(p => p.id !== id))
    return { ok: true }
  }, [pedidos])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetear = useCallback(() => {
    lsClear(); localStorage.setItem(LS.SCHEMA, SCHEMA_V)
    setClientes(CLIENTES_SEED); setProductos(PRODUCTOS_SEED); setPedidos(PEDIDOS_SEED)
    setProximoId(PROXIMO_ID_SEED); setProximoClienteId(PROXIMO_CLIENTE_ID_SEED)
  }, [])

  return (
    <AppCtx.Provider value={{ clientes, productos, pedidos, crearPedido, cambiarEstado, cancelarPedido, agregarCliente, editarCliente, eliminarCliente, agregarProducto, editarProducto, ajustarStock, eliminarProducto, resetear }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
