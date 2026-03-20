'use client'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import type { Cliente, TipoPrecio } from '@/data/mock'

type Form = { nombre: string; telefono: string; direccion: string; tipoPrecio: TipoPrecio }
const FORM_VACIO: Form = { nombre: '', telefono: '', direccion: '', tipoPrecio: 'A' }

export default function Clientes() {
  const { clientes, pedidos, agregarCliente, editarCliente, eliminarCliente } = useApp()

  const [modal,    setModal]    = useState<'nuevo' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form,     setForm]     = useState<Form>(FORM_VACIO)
  const [error,    setError]    = useState('')
  const [busqueda, setBusqueda] = useState('')

  const abrirNuevo = () => { setForm(FORM_VACIO); setError(''); setEditando(null); setModal('nuevo') }
  const abrirEditar = (c: Cliente) => {
    setForm({ nombre: c.nombre, telefono: c.telefono, direccion: c.direccion, tipoPrecio: c.tipoPrecio })
    setError(''); setEditando(c); setModal('editar')
  }
  const cerrar = () => { setModal(null); setEditando(null); setError('') }
  const setF = (k: keyof Form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const guardar = () => {
    if (!form.nombre.trim())   { setError('El nombre es obligatorio.'); return }
    if (!form.telefono.trim()) { setError('El teléfono es obligatorio.'); return }
    const datos = { nombre: form.nombre.trim(), telefono: form.telefono.trim(), direccion: form.direccion.trim(), tipoPrecio: form.tipoPrecio }
    if (modal === 'nuevo')              agregarCliente(datos)
    else if (modal === 'editar' && editando) editarCliente(editando.id, datos)
    cerrar()
  }

  const handleEliminar = (c: Cliente) => {
    if (!confirm(`¿Eliminar a "${c.nombre}"?`)) return
    const res = eliminarCliente(c.id)
    if (!res.ok) alert(res.error)
  }

  const pedidosActivos = (clienteId: number) =>
    pedidos.filter(p => p.clienteId === clienteId && !['cancelado', 'entregado'].includes(p.estado)).length

  const filtrados = clientes.filter(c =>
    !busqueda ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda)
  )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-sub">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo cliente</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: 14 }}>
          <input className="input" placeholder="Buscar por nombre o teléfono…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-ico">👥</div>
            <div className="empty-title">Sin clientes</div>
            <div className="empty-sub">{busqueda ? 'No hay resultados para esa búsqueda.' : 'Agregá el primer cliente.'}</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Lista</th>
                  <th>Pedidos activos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => {
                  const activos = pedidosActivos(c.id)
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                      <td className="mono" style={{ fontSize: 13 }}>{c.telefono}</td>
                      <td style={{ color: 'var(--ink-3)', fontSize: 13 }}>{c.direccion || '—'}</td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: 12,
                          background: c.tipoPrecio === 'A' ? 'var(--blue-s)' : 'var(--amber-s)',
                          color: c.tipoPrecio === 'A' ? 'var(--blue)' : 'var(--amber)',
                          padding: '2px 10px', borderRadius: 20,
                        }}>
                          Lista {c.tipoPrecio}
                        </span>
                      </td>
                      <td>
                        {activos > 0
                          ? <span className="badge badge-confirmado">{activos} activo{activos !== 1 ? 's' : ''}</span>
                          : <span style={{ color: 'var(--muted)', fontSize: 12 }}>ninguno</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" title="Editar" onClick={() => abrirEditar(c)}>✏️</button>
                          <button className="btn-icon danger" title="Eliminar" onClick={() => handleEliminar(c)}>🗑️</button>
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

      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div className="modal">
            <div className="modal-head">
              {modal === 'nuevo' ? 'Nuevo cliente' : `Editar — ${editando?.nombre}`}
              <button className="btn-icon" onClick={cerrar}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-col">
                <label className="form-label">Nombre *</label>
                <input className="input" placeholder="Dietética El Girasol" value={form.nombre} onChange={e => setF('nombre', e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && guardar()} />
              </div>
              <div className="form-grid-2">
                <div className="form-col">
                  <label className="form-label">Teléfono *</label>
                  <input className="input mono" placeholder="11-2345-6789" value={form.telefono} onChange={e => setF('telefono', e.target.value)} onKeyDown={e => e.key === 'Enter' && guardar()} />
                </div>
                <div className="form-col">
                  <label className="form-label">Lista de precios</label>
                  <select className="select" value={form.tipoPrecio} onChange={e => setF('tipoPrecio', e.target.value)}>
                    <option value="A">Lista A (precio lleno)</option>
                    <option value="B">Lista B (precio especial)</option>
                  </select>
                </div>
              </div>
              <div className="form-col">
                <label className="form-label">Dirección</label>
                <input className="input" placeholder="Av. Corrientes 1234, CABA" value={form.direccion} onChange={e => setF('direccion', e.target.value)} onKeyDown={e => e.key === 'Enter' && guardar()} />
              </div>
              {error && <div className="alert alert-error"><span>⚠</span><span>{error}</span></div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={cerrar}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}>{modal === 'nuevo' ? 'Agregar cliente' : 'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
