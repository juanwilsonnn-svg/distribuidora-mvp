// ─────────────────────────────────────────────────────────────────────────────
// data/mock.ts  —  Tipos y datos iniciales de la app
// Editá estos arrays para cambiar clientes, productos o pedidos de ejemplo.
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoPedido =
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'en_entrega'
  | 'entregado'
  | 'cancelado'

export type Cliente = {
  id: number
  nombre: string
  telefono: string
  direccion: string
}

export type Producto = {
  id: number
  nombre: string
  categoria: string
  precio: number       // $ por kg — precio de VENTA al cliente
  precioCosto: number  // $ por kg — costo de compra al proveedor (promedio ponderado)
  stock: number        // kg disponibles
  stockMinimo: number  // kg — alerta si baja de acá
}

export type ItemPedido = {
  productoId: number
  nombre: string
  cantidad: number     // kg
  precioUnitario: number
  subtotal: number
}

export type Pedido = {
  id: number
  clienteId: number
  nombreCliente: string
  fecha: string        // ISO string
  estado: EstadoPedido
  items: ItemPedido[]
  total: number
  totalKg: number
  notas: string
}

// ── Clientes ──────────────────────────────────────────────────────────────────
export const CLIENTES_SEED: Cliente[] = [
  { id: 1, nombre: 'Dietética El Girasol',  telefono: '11-2345-6789', direccion: 'Av. Corrientes 1234, CABA'      },
  { id: 2, nombre: 'Naturista San Martín',  telefono: '11-3456-7890', direccion: 'San Martín 567, Ramos Mejía'    },
  { id: 3, nombre: 'Bio Market Palermo',    telefono: '11-4567-8901', direccion: 'Thames 890, Palermo, CABA'      },
  { id: 4, nombre: 'La Semilla Orgánica',   telefono: '11-5678-9012', direccion: 'Rivadavia 2345, Flores, CABA'   },
  { id: 5, nombre: 'Dietética Belgrano',    telefono: '11-6789-0123', direccion: 'Cabildo 1122, Belgrano, CABA'   },
]

// ── Productos ─────────────────────────────────────────────────────────────────
export const PRODUCTOS_SEED: Producto[] = [
  { id: 1,  nombre: 'Almendras Peladas',    categoria: 'Frutos Secos', precio: 4500, precioCosto: 3000, stock: 80,  stockMinimo: 20 },
  { id: 2,  nombre: 'Nueces Mariposa',      categoria: 'Frutos Secos', precio: 5200, precioCosto: 3500, stock: 60,  stockMinimo: 15 },
  { id: 3,  nombre: 'Castañas de Cajú',     categoria: 'Frutos Secos', precio: 7800, precioCosto: 5200, stock: 40,  stockMinimo: 10 },
  { id: 4,  nombre: 'Pasas de Uva Sultana', categoria: 'Frutas Secas', precio: 2100, precioCosto: 1400, stock: 100, stockMinimo: 25 },
  { id: 5,  nombre: 'Maní Tostado s/Sal',   categoria: 'Semillas',     precio: 1800, precioCosto: 1100, stock: 90,  stockMinimo: 20 },
  { id: 6,  nombre: 'Semillas de Chía',     categoria: 'Semillas',     precio: 3200, precioCosto: 2100, stock: 50,  stockMinimo: 15 },
  { id: 7,  nombre: 'Semillas de Girasol',  categoria: 'Semillas',     precio: 1500, precioCosto: 900,  stock: 0,   stockMinimo: 30 },
  { id: 8,  nombre: 'Pistacho Natural',     categoria: 'Frutos Secos', precio: 9500, precioCosto: 6500, stock: 25,  stockMinimo: 8  },
  { id: 9,  nombre: 'Avena en Copos',       categoria: 'Cereales',     precio: 900,  precioCosto: 550,  stock: 150, stockMinimo: 40 },
  { id: 10, nombre: 'Mix Frutos Secos',     categoria: 'Mezclas',      precio: 6000, precioCosto: 4000, stock: 35,  stockMinimo: 10 },
]

// ── Pedidos de ejemplo (arrancan cargados para poder probar el depósito) ──────
export const PEDIDOS_SEED: Pedido[] = [
  {
    id: 1,
    clienteId: 1,
    nombreCliente: 'Dietética El Girasol',
    fecha: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    estado: 'confirmado',
    items: [
      { productoId: 1, nombre: 'Almendras Peladas',    cantidad: 5,   precioUnitario: 4500, subtotal: 22500 },
      { productoId: 4, nombre: 'Pasas de Uva Sultana', cantidad: 8,   precioUnitario: 2100, subtotal: 16800 },
    ],
    total: 39300,
    totalKg: 13,
    notas: 'Llamar antes de ir',
  },
  {
    id: 2,
    clienteId: 3,
    nombreCliente: 'Bio Market Palermo',
    fecha: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    estado: 'en_preparacion',
    items: [
      { productoId: 2, nombre: 'Nueces Mariposa',  cantidad: 3.5, precioUnitario: 5200, subtotal: 18200 },
      { productoId: 3, nombre: 'Castañas de Cajú', cantidad: 2,   precioUnitario: 7800, subtotal: 15600 },
      { productoId: 6, nombre: 'Semillas de Chía', cantidad: 4,   precioUnitario: 3200, subtotal: 12800 },
    ],
    total: 46600,
    totalKg: 9.5,
    notas: '',
  },
]

// ── ID de próximo pedido / cliente ────────────────────────────────────────────
export const PROXIMO_ID_SEED         = PEDIDOS_SEED.length + 1
export const PROXIMO_CLIENTE_ID_SEED = CLIENTES_SEED.length + 1
