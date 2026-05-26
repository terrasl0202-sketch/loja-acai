/**
 * Tipos TypeScript para as tabelas do Supabase
 * 
 * Estas interfaces espelham a estrutura das tabelas criadas no banco.
 * Mantenha sincronizado com o schema do Supabase.
 */

// Bairro/Neighborhood
export interface DbNeighborhood {
  id: string
  name: string
  fee: number
  active: boolean
  created_at: string
  updated_at: string
}

// Pedido/Order
export interface DbOrder {
  id: string
  customer_name: string
  customer_phone: string
  customer_address: string | null
  customer_number: string | null
  customer_reference: string | null
  neighborhood: string | null
  delivery_type: 'entrega' | 'retirada'
  payment_method: 'pix' | 'dinheiro' | 'cartao'
  items: OrderItem[]
  items_text: string | null
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  status: OrderStatus
  pix_id: string | null
  pix_status: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  subtotal: number
}

export type OrderStatus = 
  | 'pending'     // Aguardando pagamento
  | 'confirmed'   // Pagamento confirmado
  | 'preparing'   // Em preparo
  | 'delivering'  // Saiu para entrega
  | 'completed'   // Entregue
  | 'cancelled'   // Cancelado

// Input para criar pedido (sem campos auto-gerados)
export interface CreateOrderInput {
  customer_name: string
  customer_phone: string
  customer_address?: string
  customer_number?: string
  customer_reference?: string
  neighborhood?: string
  delivery_type: 'entrega' | 'retirada'
  payment_method: 'pix' | 'dinheiro' | 'cartao'
  items: OrderItem[]
  items_text?: string
  subtotal: number
  delivery_fee: number
  discount?: number
  total: number
  notes?: string
  pix_id?: string
}

// Input para atualizar pedido
export interface UpdateOrderInput {
  status?: OrderStatus
  pix_status?: string
  notes?: string
}
