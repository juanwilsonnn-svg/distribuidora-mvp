'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { Producto } from '@/data/mock'

type Form = { nombre: string; categoria: string; precio: string; precioCosto: string; stock: string; stockMinimo: string }
const FORM_VACIO: Form = { nombre: '', categoria: '', precio: '', precioCosto: '', stock: '', stockMinimo: '' }

function toForm(p: Producto): Form {
  return {
    nombre: p.nombre, categoria: p.categoria,
    precio: String(p.precio), precioCosto: String(p.precioCosto ?? ''),
    stock: String(p.stock), stockMinimo: String(p.stockMinimo),
  }
}

export default function ProductosPage() {
  const { productos, agregarProducto, editarProducto, ajustarStock, eliminarProducto } = useApp()

  const [modal,            setModal]            = useState<'nuevo' | 'editar' | 'stock' | null>(null)
  const [editando,         setEditando]         = useState<Producto | null>(null)
  const [form,             setForm]             = useState<Form>(FORM_VACIO)
  const [stockInput,       setStockInput]       = useState('')
  const [costoCompraInput, setCostoCompraInput] = useState('')
  const [error,            setError]            = useState('')
  const [busqueda,         setBusqueda]         = useState('')
  const [soloBajos,        setSoloBajos]        = useState(false)

  const abrirNuevo  = () => { setForm(FORM_VACIO); setError(''); setEditando(null); setModal('nuevo') }
  const abrirEditar = (p: Producto) => { setForm(toForm(p)); setError(''); setEditando(p); setModal('editar') }
  const abrirStock  = (p: Producto) => { setStockInput(String(p.stock)); setCostoCompraInput(''); setError(''); setEditando(p); setModal('stock') }
  const cerrar      = () => { setModal(null); setEditando(null); setError('') }
  const setF        = (k: keyof Form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const validar = (): string => {
    if (!form.nombre.trim())                          return 'El nombre es obligatorio.'
    if (!form.precio || Number(form.precio) <= 0)     return 'El precio de venta debe ser mayor a 0.'
    if (form.stock === '' || Number(form.stock) < 0)  return 'El stock no puede ser negativo.'
    if (form.stockMinimo === '' || Number(form.stockMinimo) < 0) return 'El stock mínimo no puede ser negativo.'
    return ''
  }

  const guardar = () => {
    const err = validar()
    if (err) { setError(err); return }
    const datos = {
      nombre:      form.nombre.trim(),
      categoria:   form.categoria.trim() || 'General',
      precio:      Number(form.precio),
      precioCosto: Number(form.precioCosto) || 0,
      stock:       Number(form.stock),
      stockMinimo: Number(form.stockMinimo),
    }
    if (modal === 'nuevo') agregarProducto(datos)
    else if (editando)     editarProducto(editando.id, datos)
    cerrar()
  }

  const guardarStock = () => {
    const v = Number(stockInput)
    if (isNaN(v) || v < 0) { setError('Valor inválido.'); return }
    const costo = costoCompraInput ? Number(costoCompraInput) : undefined
    if (editando) ajustarStock(editando.id, v, costo)
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

  const bajos    = productos.filter(p => p.stock > 0 && p.stock <= p.stockMinimo).length
  const sinStockN = productos.filter(p => p.stock <= 0).length

  // Calcula kg comprados para mostrar preview del promedio
  const kgComprados    = Math.max(0, (Number(stockInput) || 0) - (editando?.stock ?? 0))
  const costoNuevo     = Number(costoCompraInput) || 0
  const costoActual    = editando?.precioCosto ?? 0
  const stockActual    = editando?.stock ?? 0
  const stockFinalPrev = Number(stockInput) || 0
  const costoPromPrev  = (kgComprados > 0 && costoNuevo > 0 && stockFinalPrev > 0)
    ? Math.round(((stockActual * costoActual) + (kgComprados * costoNuevo)) / stockFinalPrev)
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
          <input
            className="input" style={{ flex: 1, minWidth: 180 }}
            placeholder="Buscar por nombre o categoría…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={soloBajos} onChange={e => setSoloBajos(e.target.checked)} />
            Solo con stock bajo
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
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Precio venta</th>
                  <th style={{ textAlign: 'right' }}>Costo prom.</th>
                  <th style={{ textAlign: 'right' }}>Margen</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Mínimo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => {
                  const sinStock = p.stock <= 0
                  const bajo     = !sinStock && p.stock <= p.stockMinimo
                  const margen   = p.precioCosto > 0
                    ? Math.round(((p.precio - p.precioCosto) / p.precio) * 100)
                    : null
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{p.categoria}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                        ${p.precio.toLocaleString('es-AR')}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                        {p.precioCosto > 0 ? `$${p.precioCosto.toLocaleString('es-AR')}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {margen !== null ? (
                          <span style={{ fontWeight: 700, color: margen >= 30 ? 'var(--green)' : margen >= 15 ? 'var(--amber)' : 'var(--red)' }}>
                            {margen}%
                          </span>
                        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: sinStock ? 'var(--red)' : bajo ? 'var(--amber)' : 'var(--green)' }}>
                        {p.stock} kg
                      </td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>{p.stockMinimo} kg</td>
                      <td>
                        {sinStock ? <span className="badge badge-cancelado">Sin stock</span>
                          : bajo   ? <span className="badge badge-en_preparacion">Stock bajo</span>
                          :          <span className="badge badge-entregado">OK</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-icon" title="Ajustar stock" onClick={() => abrirStock(p)}>📊</button>
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

      {/* Modal nuevo/editar */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="modal">
            <div className="modal-head">
              {modal === 'nuevo' ? 'Nuevo producto' : `Editar — ${editando?.nombre}`}
              <button className="btn-icon" onClick={cerrar}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-col">
                <label className="form-label">Nombre *</label>
                <input className="input" placeholder="Almendras Peladas" value={form.nombre} onChange={e => setF('nombre', e.target.value)} autoFocus />
              </div>
              <div className="form-col">
                <label className="form-label">Categoría</label>
                <input className="input" placeholder="Frutos Secos" value={form.categoria} onChange={e => setF('categoria', e.target.value)} />
              </div>
              <div className="form-grid-2">
                <div className="form-col">
                  <label className="form-label">Precio de venta / kg *</label>
                  <input className="input mono" type="number" min="0" step="100" placeholder="4500" value={form.precio} onChange={e => setF('precio', e.target.value)} />
                </div>
                <div className="form-col">
                  <label className="form-label">Costo de compra / kg</label>
                  <input className="input mono" type="number" min="0" step="100" placeholder="3000" value={form.precioCosto} onChange={e => setF('precioCosto', e.target.value)} />
                </div>
              </div>
              {form.precio && form.precioCosto && Number(form.precio) > 0 && Number(form.precioCosto) > 0 && (
                <div style={{ background: 'var(--green-s)', border: '1px solid var(--green-b)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13 }}>
                  Margen estimado: <strong style={{ color: 'var(--green)' }}>
                    {Math.round(((Number(form.precio) - Number(form.precioCosto)) / Number(form.precio)) * 100)}%
                  </strong>
                </div>
              )}
              <div className="form-grid-2">
                <div className="form-col">
                  <label className="form-label">Stock inicial (kg)</label>
                  <input className="input mono" type="number" min="0" step="0.1" placeholder="50" value={form.stock} onChange={e => setF('stock', e.target.value)} />
                </div>
                <div className="form-col">
                  <label className="form-label">Stock mínimo (kg)</label>
                  <input className="input mono" type="number" min="0" step="0.5" placeholder="15" value={form.stockMinimo} onChange={e => setF('stockMinimo', e.target.value)} />
                </div>
              </div>
              {error && <div className="alert alert-error"><span>⚠</span><span>{error}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}>
                {modal === 'nuevo' ? 'Agregar producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajuste de stock */}
      {modal === 'stock' && editando && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="modal">
            <div className="modal-head">
              Ingresar mercadería — {editando.nombre}
              <button className="btn-icon" onClick={cerrar}>✕</button>
            </div>
            <div className="modal-body">
              {/* Info actual */}
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
                <label className="form-label">Nuevo stock total (kg)</label>
                <input
                  className="input mono" type="number" min="0" step="0.1"
                  value={stockInput} onChange={e => setStockInput(e.target.value)}
                  autoFocus onKeyDown={e => e.key === 'Enter' && guardarStock()}
                />
              </div>

              {/* Botones rápidos */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Agregar kg rápido</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[5, 10, 20, 50].map(n => (
                    <button key={n} className="btn btn-ghost btn-sm"
                      onClick={() => setStockInput(v => String(Math.round((Number(v) + n) * 100) / 100))}>
                      +{n} kg
                    </button>
                  ))}
                </div>
              </div>

              {/* Precio de la compra */}
              <div className="form-col">
                <label className="form-label">Precio de costo de esta compra / kg (opcional)</label>
                <input
                  className="input mono" type="number" min="0" step="100"
                  placeholder={`Ej: ${editando.precioCosto > 0 ? editando.precioCosto : '3000'}`}
                  value={costoCompraInput} onChange={e => setCostoCompraInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarStock()}
                />
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Si compraste a un precio distinto, el sistema calcula el costo promedio ponderado automáticamente.
                </div>
              </div>

              {/* Preview del promedio */}
              {costoPromPrev !== null && (
                <div style={{ background: 'var(--blue-s)', border: '1px solid var(--blue-b)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>Preview del nuevo costo promedio</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span>{kgComprados.toFixed(2)} kg nuevos × ${Number(costoCompraInput).toLocaleString('es-AR')}</span>
                    <span style={{ color: 'var(--muted)' }}>→</span>
                    <span className="mono" style={{ fontWeight: 700 }}>Nuevo costo prom: ${costoPromPrev.toLocaleString('es-AR')}/kg</span>
                  </div>
                </div>
              )}

              {error && <div className="alert alert-error"><span>⚠</span><span>{error}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
              <button className="btn btn-success" onClick={guardarStock}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
