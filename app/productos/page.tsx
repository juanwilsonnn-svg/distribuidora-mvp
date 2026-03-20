'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { Producto } from '@/data/mock'

type Form = { nombre: string; categoria: string; precio: string; stock: string; stockMinimo: string }
const FORM_VACIO: Form = { nombre: '', categoria: '', precio: '', stock: '', stockMinimo: '' }

function toForm(p: Producto): Form {
  return { nombre: p.nombre, categoria: p.categoria, precio: String(p.precio), stock: String(p.stock), stockMinimo: String(p.stockMinimo) }
}

export default function ProductosPage() {
  const { productos, agregarProducto, editarProducto, ajustarStock, eliminarProducto } = useApp()

  const [modal,       setModal]       = useState<'nuevo' | 'editar' | 'stock' | null>(null)
  const [editando,    setEditando]    = useState<Producto | null>(null)
  const [form,        setForm]        = useState<Form>(FORM_VACIO)
  const [stockInput,  setStockInput]  = useState('')
  const [error,       setError]       = useState('')
  const [busqueda,    setBusqueda]    = useState('')
  const [soloBajos,   setSoloBajos]   = useState(false)

  const abrirNuevo = () => { setForm(FORM_VACIO); setError(''); setEditando(null); setModal('nuevo') }

  const abrirEditar = (p: Producto) => { setForm(toForm(p)); setError(''); setEditando(p); setModal('editar') }

  const abrirStock = (p: Producto) => { setStockInput(String(p.stock)); setError(''); setEditando(p); setModal('stock') }

  const cerrar = () => { setModal(null); setEditando(null); setError('') }

  const setF = (k: keyof Form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const validar = (): string => {
    if (!form.nombre.trim())         return 'El nombre es obligatorio.'
    if (!form.precio || Number(form.precio) <= 0) return 'El precio debe ser mayor a 0.'
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
      stock:       Number(form.stock),
      stockMinimo: Number(form.stockMinimo),
    }
    if (modal === 'nuevo')          agregarProducto(datos)
    else if (editando)              editarProducto(editando.id, datos)
    cerrar()
  }

  const guardarStock = () => {
    const v = Number(stockInput)
    if (isNaN(v) || v < 0) { setError('Valor inválido.'); return }
    if (editando) ajustarStock(editando.id, v)
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

  const bajos   = productos.filter(p => p.stock > 0 && p.stock <= p.stockMinimo).length
  const sinStock = productos.filter(p => p.stock <= 0).length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Productos</div>
          <div className="page-sub">{productos.length} productos · {sinStock > 0 && <span style={{ color: 'var(--red)' }}>{sinStock} sin stock · </span>}{bajos > 0 && <span style={{ color: 'var(--amber)' }}>{bajos} stock bajo</span>}</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Buscar por nombre o categoría…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={soloBajos} onChange={e => setSoloBajos(e.target.checked)} />
            Solo con stock bajo
          </label>
        </div>
      </div>

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
                  <th style={{ textAlign: 'right' }}>Precio/kg</th>
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
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                      <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{p.categoria}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>${p.precio.toLocaleString('es-AR')}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: sinStock ? 'var(--red)' : bajo ? 'var(--amber)' : 'var(--green)' }}>{p.stock} kg</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>{p.stockMinimo} kg</td>
                      <td>
                        {sinStock ? <span className="badge badge-cancelado">Sin stock</span>
                          : bajo   ? <span className="badge badge-en_preparacion">Stock bajo</span>
                          :          <span className="badge badge-entregado">OK</span>
                        }
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
                  <label className="form-label">Precio por kg *</label>
                  <input className="input mono" type="number" min="0" step="100" placeholder="4500" value={form.precio} onChange={e => setF('precio', e.target.value)} />
                </div>
                <div className="form-col">
                  <label className="form-label">Stock inicial (kg)</label>
                  <input className="input mono" type="number" min="0" step="0.1" placeholder="50" value={form.stock} onChange={e => setF('stock', e.target.value)} />
                </div>
              </div>
              <div className="form-col">
                <label className="form-label">Stock mínimo (kg)</label>
                <input className="input mono" type="number" min="0" step="0.5" placeholder="15" value={form.stockMinimo} onChange={e => setF('stockMinimo', e.target.value)} />
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
              Ajustar stock — {editando.nombre}
              <button className="btn-icon" onClick={cerrar}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--line-2)', borderRadius: 'var(--r)', padding: '14px 16px', fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Stock actual</span>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 18 }}>{editando.stock} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>Stock mínimo</span>
                  <span className="mono">{editando.stockMinimo} kg</span>
                </div>
              </div>
              <div className="form-col">
                <label className="form-label">Nuevo stock (kg)</label>
                <input
                  className="input mono"
                  type="number" min="0" step="0.1"
                  value={stockInput}
                  onChange={e => setStockInput(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && guardarStock()}
                />
              </div>
              {/* Botones rápidos de incremento */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Agregar rápido</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[5, 10, 20, 50].map(n => (
                    <button key={n} className="btn btn-ghost btn-sm"
                      onClick={() => setStockInput(v => String(Math.round((Number(v) + n) * 100) / 100))}>
                      +{n} kg
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="alert alert-error"><span>⚠</span><span>{error}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
              <button className="btn btn-success" onClick={guardarStock}>Guardar stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
