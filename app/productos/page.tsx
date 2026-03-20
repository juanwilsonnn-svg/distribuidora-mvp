'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { calcularStockComprometido, calcularPrecioPromedioReal, stockPosibleMix } from '@/context/AppContext'
import type { Producto, RecetaItem } from '@/data/mock'

type Form = {
  nombre: string; categoria: string; tipo: 'simple' | 'mix'
  precioA: string; precioB: string; precioCosto: string
  stock: string; stockMinimo: string
  receta: { productoId: string; kgPorUnidad: string }[]
}
const FORM_VACIO: Form = {
  nombre: '', categoria: '', tipo: 'simple',
  precioA: '', precioB: '', precioCosto: '',
  stock: '', stockMinimo: '', receta: [],
}

function toForm(p: Producto): Form {
  return {
    nombre: p.nombre, categoria: p.categoria, tipo: p.tipo,
    precioA: String(p.precioA), precioB: String(p.precioB),
    precioCosto: String(p.precioCosto ?? ''),
    stock: String(p.stock), stockMinimo: String(p.stockMinimo),
    receta: (p.receta ?? []).map(r => ({ productoId: String(r.productoId), kgPorUnidad: String(r.kgPorUnidad) })),
  }
}

export default function ProductosPage() {
  const { productos, pedidos, agregarProducto, editarProducto, ajustarStock, armarLote, eliminarProducto } = useApp()

  const [modal,            setModal]            = useState<'nuevo' | 'editar' | 'stock' | 'armar' | null>(null)
  const [editando,         setEditando]         = useState<Producto | null>(null)
  const [form,             setForm]             = useState<Form>(FORM_VACIO)
  const [stockInput,       setStockInput]       = useState('')
  const [costoCompraInput, setCostoCompraInput] = useState('')
  const [armarCantidad,    setArmarCantidad]    = useState('')
  const [error,            setError]            = useState('')
  const [busqueda,         setBusqueda]         = useState('')
  const [soloBajos,        setSoloBajos]        = useState(false)

  const simples = productos.filter(p => p.tipo === 'simple')

  const abrirNuevo  = () => { setForm(FORM_VACIO); setError(''); setEditando(null); setModal('nuevo') }
  const abrirEditar = (p: Producto) => { setForm(toForm(p)); setError(''); setEditando(p); setModal('editar') }
  const abrirStock  = (p: Producto) => { setStockInput(''); setCostoCompraInput(''); setError(''); setEditando(p); setModal('stock') }
  const abrirArmar  = (p: Producto) => { setArmarCantidad(''); setError(''); setEditando(p); setModal('armar') }
  const cerrar      = () => { setModal(null); setEditando(null); setError('') }
  const setF        = (k: keyof Form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  // Receta helpers
  const addRecetaItem   = () => setForm(prev => ({ ...prev, receta: [...prev.receta, { productoId: '', kgPorUnidad: '' }] }))
  const removeRecetaItem = (i: number) => setForm(prev => ({ ...prev, receta: prev.receta.filter((_, idx) => idx !== i) }))
  const setRecetaItem   = (i: number, k: 'productoId' | 'kgPorUnidad', v: string) =>
    setForm(prev => ({ ...prev, receta: prev.receta.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }))

  const validar = (): string => {
    if (!form.nombre.trim())                         return 'El nombre es obligatorio.'
    if (!form.precioA || Number(form.precioA) <= 0)  return 'El precio Lista A debe ser mayor a 0.'
    if (!form.precioB || Number(form.precioB) <= 0)  return 'El precio Lista B debe ser mayor a 0.'
    if (form.stock === '' || Number(form.stock) < 0) return 'El stock no puede ser negativo.'
    if (form.stockMinimo === '' || Number(form.stockMinimo) < 0) return 'El stock mínimo no puede ser negativo.'
    if (form.tipo === 'mix') {
      if (form.receta.length === 0) return 'El mix debe tener al menos un componente.'
      for (const r of form.receta) {
        if (!r.productoId) return 'Seleccioná un componente en la receta.'
        if (!r.kgPorUnidad || Number(r.kgPorUnidad) <= 0) return 'El kg por unidad debe ser mayor a 0.'
      }
    }
    return ''
  }

  const guardar = () => {
    const err = validar(); if (err) { setError(err); return }
    const datos: Omit<Producto, 'id'> = {
      nombre: form.nombre.trim(), categoria: form.categoria.trim() || 'General',
      tipo: form.tipo, unidad: form.tipo === 'mix' ? 'unidad' : 'kg',
      receta: form.tipo === 'mix'
        ? form.receta.map(r => ({ productoId: Number(r.productoId), kgPorUnidad: Number(r.kgPorUnidad) }))
        : undefined,
      precioA: Number(form.precioA), precioB: Number(form.precioB),
      precioCosto: Number(form.precioCosto) || 0,
      stock: Number(form.stock), stockMinimo: Number(form.stockMinimo),
    }
    if (modal === 'nuevo') agregarProducto(datos)
    else if (editando)     editarProducto(editando.id, datos)
    cerrar()
  }

  const guardarStock = () => {
    const kgComprados = Number(stockInput)
    if (isNaN(kgComprados) || kgComprados <= 0) { setError('Ingresá los kg comprados (debe ser mayor a 0).'); return }
    const costo = costoCompraInput ? Number(costoCompraInput) : undefined
    if (editando) ajustarStock(editando.id, editando.stock + kgComprados, costo)
    cerrar()
  }

  const confirmarArmarLote = () => {
    const u = Math.round(Number(armarCantidad))
    if (!u || u <= 0) { setError('Ingresá una cantidad válida.'); return }
    if (!editando) return
    const res = armarLote(editando.id, u)
    if (!res.ok) { setError(res.error ?? 'Error al armar el lote.'); return }
    cerrar()
  }

  const handleEliminar = (p: Producto) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    const res = eliminarProducto(p.id)
    if (!res.ok) alert(res.error)
  }

  const filtrados = productos.filter(p => {
    const matchB = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.categoria.toLowerCase().includes(busqueda.toLowerCase())
    const matchS = !soloBajos || p.stock <= p.stockMinimo
    return matchB && matchS
  })

  const bajos     = productos.filter(p => p.stock > 0 && p.stock <= p.stockMinimo).length
  const sinStockN = productos.filter(p => p.stock <= 0).length

  // Preview armar lote
  const armarUnidades = Math.round(Number(armarCantidad)) || 0

  // Preview costo promedio en modal stock
  const kgComprados    = Number(stockInput) || 0
  const costoNuevo     = Number(costoCompraInput) || 0
  const stockFinalPrev = (editando?.stock ?? 0) + kgComprados
  const costoPromPrev  = (kgComprados > 0 && costoNuevo > 0 && stockFinalPrev > 0 && editando)
    ? Math.round(((editando.stock * editando.precioCosto) + (kgComprados * costoNuevo)) / stockFinalPrev)
    : null

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Productos</div>
          <div className="page-sub">
            {productos.length} productos
            {sinStockN > 0 && <span style={{ color: 'var(--red)' }}> · {sinStockN} sin stock</span>}
            {bajos > 0     && <span style={{ color: 'var(--amber)' }}> · {bajos} stock bajo</span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Buscar por nombre o categoría…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={soloBajos} onChange={e => setSoloBajos(e.target.checked)} />
            Solo stock bajo
          </label>
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-ico">📦</div>
            <div className="empty-title">Sin productos</div>
            <div className="empty-sub">{busqueda || soloBajos ? 'No hay resultados.' : 'Agregá el primer producto.'}</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cat.</th>
                  <th style={{ textAlign: 'right' }}>Lista A</th>
                  <th style={{ textAlign: 'right' }}>Lista B</th>
                  <th style={{ textAlign: 'right' }}>Margen A</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Comprometido</th>
                  <th style={{ textAlign: 'right' }}>Disponible</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const comprometido = calcularStockComprometido(pedidos, p.id)
                  const disponible   = Math.max(0, p.stock - comprometido)
                  const margenA      = p.precioCosto > 0 ? Math.round(((p.precioA - p.precioCosto) / p.precioA) * 100) : null
                  const sinStock     = p.stock <= 0
                  const bajo         = !sinStock && p.stock <= p.stockMinimo
                  const dispColor    = disponible <= 0 ? 'var(--red)' : disponible <= p.stockMinimo ? 'var(--amber)' : 'var(--green)'
                  const esMix        = p.tipo === 'mix'
                  const posibleArmar = esMix ? stockPosibleMix(productos, p) : null

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>
                        {p.nombre}
                        {esMix && <span style={{ fontSize: 10, marginLeft: 5, background: 'var(--amber-s)', color: 'var(--amber)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>MIX</span>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.categoria}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>${p.precioA.toLocaleString('es-AR')}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>${p.precioB.toLocaleString('es-AR')}</td>
                      <td style={{ textAlign: 'right' }}>
                        {margenA !== null
                          ? <span style={{ fontWeight: 700, color: margenA >= 30 ? 'var(--green)' : margenA >= 15 ? 'var(--amber)' : 'var(--red)' }}>{margenA}%</span>
                          : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: sinStock ? 'var(--red)' : bajo ? 'var(--amber)' : 'var(--ink)' }}>
                        {p.stock} {esMix ? 'u.' : 'kg'}
                        {esMix && posibleArmar !== null && posibleArmar > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>+{posibleArmar} posibles</div>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: comprometido > 0 ? 'var(--amber)' : 'var(--muted)' }}>
                        {comprometido > 0 ? `${Math.round(comprometido * 100) / 100} ${esMix ? 'u.' : 'kg'}` : '—'}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: dispColor }}>
                        {Math.round(disponible * 100) / 100} {esMix ? 'u.' : 'kg'}
                      </td>
                      <td>
                        {sinStock          ? <span className="badge badge-cancelado">Sin stock</span>
                          : bajo           ? <span className="badge badge-en_preparacion">Stock bajo</span>
                          : disponible <= 0 ? <span className="badge badge-en_preparacion">Sin disp.</span>
                          :                  <span className="badge badge-entregado">OK</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {esMix
                            ? <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '4px 8px' }} title="Armar lote" onClick={() => abrirArmar(p)}>🏭 Armar</button>
                            : <button className="btn-icon" title="Ingresar mercadería" onClick={() => abrirStock(p)}>📊</button>
                          }
                          <button className="btn-icon" title="Editar" onClick={() => abrirEditar(p)}>✏️</button>
                          <button className="btn-icon danger" title="Eliminar" onClick={() => handleEliminar(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal nuevo/editar ──────────────────────────────────────────────── */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              {modal === 'nuevo' ? 'Nuevo producto' : `Editar — ${editando?.nombre}`}
              <button className="btn-icon" onClick={cerrar}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-col">
                  <label className="form-label">Nombre *</label>
                  <input className="input" placeholder="Mix Frutos Secos" value={form.nombre} onChange={e => setF('nombre', e.target.value)} autoFocus />
                </div>
                <div className="form-col">
                  <label className="form-label">Categoría</label>
                  <input className="input" placeholder="Mezclas" value={form.categoria} onChange={e => setF('categoria', e.target.value)} />
                </div>
              </div>

              <div className="form-col">
                <label className="form-label">Tipo</label>
                <select className="select" value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
                  <option value="simple">Simple — se vende por kg</option>
                  <option value="mix">Mix — se vende por paquete/unidad</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-col">
                  <label className="form-label">Precio Lista A *</label>
                  <input className="input mono" type="number" min="0" step="100" placeholder="6000" value={form.precioA} onChange={e => setF('precioA', e.target.value)} />
                </div>
                <div className="form-col">
                  <label className="form-label">Precio Lista B *</label>
                  <input className="input mono" type="number" min="0" step="100" placeholder="5500" value={form.precioB} onChange={e => setF('precioB', e.target.value)} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-col">
                  <label className="form-label">Costo unitario</label>
                  <input className="input mono" type="number" min="0" step="100" placeholder="4000" value={form.precioCosto} onChange={e => setF('precioCosto', e.target.value)} />
                </div>
                <div className="form-col">
                  <label className="form-label">Stock mínimo ({form.tipo === 'mix' ? 'u.' : 'kg'})</label>
                  <input className="input mono" type="number" min="0" step="1" placeholder="10" value={form.stockMinimo} onChange={e => setF('stockMinimo', e.target.value)} />
                </div>
              </div>

              {modal === 'nuevo' && (
                <div className="form-col">
                  <label className="form-label">Stock inicial ({form.tipo === 'mix' ? 'u.' : 'kg'})</label>
                  <input className="input mono" type="number" min="0" step="1" placeholder="0" value={form.stock} onChange={e => setF('stock', e.target.value)} />
                </div>
              )}

              {/* Receta del mix */}
              {form.tipo === 'mix' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Receta — componentes por unidad</label>
                    <button className="btn btn-ghost btn-sm" onClick={addRecetaItem}>+ Agregar</button>
                  </div>
                  {form.receta.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>Sin componentes. Hacé click en "+ Agregar".</div>
                  )}
                  {form.receta.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <select
                        className="select" style={{ flex: 2 }}
                        value={r.productoId}
                        onChange={e => setRecetaItem(i, 'productoId', e.target.value)}
                      >
                        <option value="">— Componente —</option>
                        {simples.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <input
                        className="input mono" style={{ flex: 1 }}
                        type="number" min="0.001" step="0.1"
                        placeholder="0.4 kg"
                        value={r.kgPorUnidad}
                        onChange={e => setRecetaItem(i, 'kgPorUnidad', e.target.value)}
                      />
                      <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>kg/u.</span>
                      <button className="btn-icon danger" onClick={() => removeRecetaItem(i)}>✕</button>
                    </div>
                  ))}
                  {form.receta.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      Total por unidad: {form.receta.reduce((s, r) => s + (Number(r.kgPorUnidad) || 0), 0).toFixed(3)} kg
                    </div>
                  )}
                </div>
              )}

              {form.precioA && form.precioCosto && Number(form.precioA) > 0 && Number(form.precioCosto) > 0 && (
                <div style={{ background: 'var(--green-s)', border: '1px solid var(--green-b)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13 }}>
                  Margen Lista A: <strong style={{ color: 'var(--green)' }}>
                    {Math.round(((Number(form.precioA) - Number(form.precioCosto)) / Number(form.precioA)) * 100)}%
                  </strong>
                  {form.precioB && Number(form.precioB) > 0 && (
                    <span style={{ marginLeft: 16 }}>Lista B: <strong style={{ color: 'var(--amber)' }}>
                      {Math.round(((Number(form.precioB) - Number(form.precioCosto)) / Number(form.precioB)) * 100)}%
                    </strong></span>
                  )}
                </div>
              )}
              {error && <div className="alert alert-error"><span>⚠</span><span>{error}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}>{modal === 'nuevo' ? 'Agregar producto' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ajuste de stock (solo simples) ───────────────────────────── */}
      {modal === 'stock' && editando && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="modal">
            <div className="modal-head">Ingresar mercadería — {editando.nombre}<button className="btn-icon" onClick={cerrar}>✕</button></div>
            <div className="modal-body">
              {/* Estado actual */}
              <div style={{ background: 'var(--line-2)', borderRadius: 'var(--r)', padding: '12px 16px', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Stock actual</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{editando.stock} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Costo promedio actual</span>
                  <span className="mono">{editando.precioCosto > 0 ? `$${editando.precioCosto.toLocaleString('es-AR')}/kg` : '—'}</span>
                </div>
              </div>

              <div className="form-col">
                <label className="form-label">¿Cuántos kg compraste?</label>
                <input
                  className="input mono" type="number" min="0.001" step="0.1"
                  placeholder="Ej: 50"
                  value={stockInput}
                  onChange={e => setStockInput(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && guardarStock()}
                />
              </div>

              {/* Botones rápidos */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Cantidad rápida</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[5, 10, 20, 50].map(n => (
                    <button key={n} className="btn btn-ghost btn-sm"
                      onClick={() => setStockInput(String(n))}>
                      {n} kg
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-col">
                <label className="form-label">Precio de costo de esta compra / kg (opcional)</label>
                <input
                  className="input mono" type="number" min="0" step="100"
                  placeholder={`Ej: ${editando.precioCosto > 0 ? editando.precioCosto : '3000'}`}
                  value={costoCompraInput}
                  onChange={e => setCostoCompraInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarStock()}
                />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Si compraste a un precio distinto, el sistema calcula el costo promedio ponderado.
                </div>
              </div>

              {/* Preview */}
              {Number(stockInput) > 0 && (
                <div style={{ background: 'var(--blue-s)', border: '1px solid var(--blue-b)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 8 }}>Resultado</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--muted)' }}>Nuevo stock</span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {editando.stock} + {Number(stockInput)} = <strong>{Math.round((editando.stock + Number(stockInput)) * 100) / 100} kg</strong>
                    </span>
                  </div>
                  {costoPromPrev !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Nuevo costo promedio</span>
                      <span className="mono" style={{ fontWeight: 700 }}>${costoPromPrev.toLocaleString('es-AR')}/kg</span>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="alert alert-error"><span>⚠</span><span>{error}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
              <button className="btn btn-success" onClick={guardarStock}>
                {Number(stockInput) > 0 ? `+ ${Number(stockInput)} kg al stock` : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal armar lote (solo mix) ─────────────────────────────────────── */}
      {modal === 'armar' && editando && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="modal">
            <div className="modal-head">
              🏭 Armar lote — {editando.nombre}
              <button className="btn-icon" onClick={cerrar}>✕</button>
            </div>
            <div className="modal-body">
              {/* Estado actual */}
              <div style={{ background: 'var(--line-2)', borderRadius: 'var(--r)', padding: '12px 16px', fontSize: 13, marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>Stock actual del mix</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{editando.stock} u.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Máximo posible con stock actual</span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--green)' }}>
                    {stockPosibleMix(productos, editando)} u.
                  </span>
                </div>
              </div>

              {/* Receta con stock disponible */}
              {editando.receta && editando.receta.length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                    Receta por unidad
                  </div>
                  {editando.receta.map((r, i) => {
                    const comp     = productos.find(p => p.id === r.productoId)
                    const necesario = armarUnidades > 0 ? r.kgPorUnidad * armarUnidades : null
                    const hayStock  = comp && necesario !== null ? comp.stock >= necesario : true
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < editando.receta!.length - 1 ? '1px solid var(--line-2)' : 'none', fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{comp?.nombre ?? `Producto #${r.productoId}`}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div className="mono" style={{ fontWeight: 700 }}>{r.kgPorUnidad} kg/u.</div>
                          {necesario !== null && (
                            <div style={{ fontSize: 11, color: hayStock ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                              {necesario.toFixed(3)} kg necesarios · {comp?.stock ?? 0} kg disponibles
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="form-col">
                <label className="form-label">¿Cuántas unidades querés armar?</label>
                <input
                  className="input mono"
                  type="number" min="1" step="1"
                  placeholder="Ej: 50"
                  value={armarCantidad}
                  onChange={e => setArmarCantidad(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && confirmarArmarLote()}
                />
              </div>

              {/* Resumen de lo que se va a descontar */}
              {armarUnidades > 0 && editando.receta && (
                <div style={{ background: 'var(--amber-s)', border: '1px solid var(--amber-b)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>Se va a descontar del inventario:</div>
                  {editando.receta.map((r, i) => {
                    const comp = productos.find(p => p.id === r.productoId)
                    const kg   = Math.round(r.kgPorUnidad * armarUnidades * 1000) / 1000
                    const ok   = comp && comp.stock >= kg
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span>{comp?.nombre}</span>
                        <span className="mono" style={{ fontWeight: 700, color: ok ? 'var(--ink)' : 'var(--red)' }}>
                          {kg} kg {!ok && '⚠ sin stock'}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ borderTop: '1px solid var(--amber-b)', marginTop: 8, paddingTop: 8, fontWeight: 700 }}>
                    Mix {editando.nombre}: {editando.stock} → {editando.stock + armarUnidades} u.
                  </div>
                </div>
              )}

              {error && <div className="alert alert-error"><span>⚠</span><span>{error}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!armarUnidades || armarUnidades <= 0}
                onClick={confirmarArmarLote}
              >
                🏭 Armar {armarUnidades > 0 ? armarUnidades : ''} unidades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
