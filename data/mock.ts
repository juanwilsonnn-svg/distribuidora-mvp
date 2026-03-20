// data/mock.ts — v5
// Agrega: fechaEntrega en Pedido, tipoPrecio en Cliente, precioA/B en Producto,
// tipo mix con receta, lista de precio por cliente.

export type EstadoPedido =
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'en_entrega'
  | 'entregado'
  | 'cancelado'

export type TipoPrecio = 'A' | 'B'

export type Cliente = {
  id: number
  nombre: string
  telefono: string
  direccion: string
  tipoPrecio: TipoPrecio   // qué lista de precios usa
}

export type RecetaItem = {
  productoId: number
  porcentaje: number  // 0-100, suma debe dar 100
}

export type Producto = {
  id: number
  nombre: string
  categoria: string
  tipo: 'simple' | 'mix'
  receta?: RecetaItem[]    // solo si tipo === 'mix'
  precioA: number          // precio lista A (por kg)
  precioB: number          // precio lista B (por kg)
  precioCosto: number      // costo promedio ponderado (por kg)
  stock: number            // kg disponibles
  stockMinimo: number
}

export type ItemPedido = {
  productoId: number
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export type Pedido = {
  id: number
  clienteId: number
  nombreCliente: string
  fecha: string          // ISO — cuándo se creó
  fechaEntrega: string   // ISO — cuándo hay que entregar (YYYY-MM-DD)
  estado: EstadoPedido
  items: ItemPedido[]
  total: number
  totalKg: number
  notas: string
}

// ── Clientes ──────────────────────────────────────────────────────────────────
export const CLIENTES_SEED: Cliente[] = [
  { id: 1, nombre: 'Dietética El Girasol',  telefono: '11-2345-6789', direccion: 'Av. Corrientes 1234, CABA',    tipoPrecio: 'A' },
  { id: 2, nombre: 'Naturista San Martín',  telefono: '11-3456-7890', direccion: 'San Martín 567, Ramos Mejía',  tipoPrecio: 'B' },
  { id: 3, nombre: 'Bio Market Palermo',    telefono: '11-4567-8901', direccion: 'Thames 890, Palermo, CABA',    tipoPrecio: 'A' },
  { id: 4, nombre: 'La Semilla Orgánica',   telefono: '11-5678-9012', direccion: 'Rivadavia 2345, Flores, CABA', tipoPrecio: 'B' },
  { id: 5, nombre: 'Dietética Belgrano',    telefono: '11-6789-0123', direccion: 'Cabildo 1122, Belgrano, CABA', tipoPrecio: 'A' },
]

// ── Productos ─────────────────────────────────────────────────────────────────
export const PRODUCTOS_SEED: Producto[] = [
  { id: 1,  nombre: 'Almendras Peladas',    categoria: 'Frutos Secos', tipo: 'simple', precioA: 4500, precioB: 4200, precioCosto: 3000, stock: 80,  stockMinimo: 20 },
  { id: 2,  nombre: 'Nueces Mariposa',      categoria: 'Frutos Secos', tipo: 'simple', precioA: 5200, precioB: 4800, precioCosto: 3500, stock: 60,  stockMinimo: 15 },
  { id: 3,  nombre: 'Castañas de Cajú',     categoria: 'Frutos Secos', tipo: 'simple', precioA: 7800, precioB: 7200, precioCosto: 5200, stock: 40,  stockMinimo: 10 },
  { id: 4,  nombre: 'Pasas de Uva Sultana', categoria: 'Frutas Secas', tipo: 'simple', precioA: 2100, precioB: 1950, precioCosto: 1400, stock: 100, stockMinimo: 25 },
  { id: 5,  nombre: 'Maní Tostado s/Sal',   categoria: 'Semillas',     tipo: 'simple', precioA: 1800, precioB: 1650, precioCosto: 1100, stock: 90,  stockMinimo: 20 },
  { id: 6,  nombre: 'Semillas de Chía',     categoria: 'Semillas',     tipo: 'simple', precioA: 3200, precioB: 2950, precioCosto: 2100, stock: 50,  stockMinimo: 15 },
  { id: 7,  nombre: 'Semillas de Girasol',  categoria: 'Semillas',     tipo: 'simple', precioA: 1500, precioB: 1400, precioCosto: 900,  stock: 0,   stockMinimo: 30 },
  { id: 8,  nombre: 'Pistacho Natural',     categoria: 'Frutos Secos', tipo: 'simple', precioA: 9500, precioB: 8800, precioCosto: 6500, stock: 25,  stockMinimo: 8  },
  { id: 9,  nombre: 'Avena en Copos',       categoria: 'Cereales',     tipo: 'simple', precioA: 900,  precioB: 830,  precioCosto: 550,  stock: 150, stockMinimo: 40 },
  {
    id: 10, nombre: 'Mix Frutos Secos', categoria: 'Mezclas', tipo: 'mix',
    receta: [
      { productoId: 1, porcentaje: 40 },  // 40% Almendras
      { productoId: 2, porcentaje: 35 },  // 35% Nueces
      { productoId: 3, porcentaje: 25 },  // 25% Castañas
    ],
    precioA: 6000, precioB: 5500, precioCosto: 4000, stock: 35, stockMinimo: 10,
  },
]

// ── Pedidos de ejemplo ────────────────────────────────────────────────────────
function hoy() { return new Date().toISOString().slice(0, 10) }
function manana() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10)
}

export const PEDIDOS_SEED: Pedido[] = [
  {
    id: 1, clienteId: 1, nombreCliente: 'Dietética El Girasol',
    fecha: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    fechaEntrega: hoy(),
    estado: 'confirmado',
    items: [
      { productoId: 1, nombre: 'Almendras Peladas',    cantidad: 5,   precioUnitario: 4500, subtotal: 22500 },
      { productoId: 4, nombre: 'Pasas de Uva Sultana', cantidad: 8,   precioUnitario: 2100, subtotal: 16800 },
    ],
    total: 39300, totalKg: 13, notas: 'Llamar antes de ir',
  },
  {
    id: 2, clienteId: 3, nombreCliente: 'Bio Market Palermo',
    fecha: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    fechaEntrega: manana(),
    estado: 'en_preparacion',
    items: [
      { productoId: 2, nombre: 'Nueces Mariposa',  cantidad: 3.5, precioUnitario: 5200, subtotal: 18200 },
      { productoId: 3, nombre: 'Castañas de Cajú', cantidad: 2,   precioUnitario: 7800, subtotal: 15600 },
      { productoId: 6, nombre: 'Semillas de Chía', cantidad: 4,   precioUnitario: 3200, subtotal: 12800 },
    ],
    total: 46600, totalKg: 9.5, notas: '',
  },
]

export const PROXIMO_ID_SEED         = PEDIDOS_SEED.length + 1
export const PROXIMO_CLIENTE_ID_SEED = CLIENTES_SEED.length + 1
