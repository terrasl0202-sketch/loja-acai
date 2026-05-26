/**
 * Supabase Services - Index
 * 
 * Este arquivo exporta todos os servicos do Supabase de forma centralizada.
 * 
 * ========================================
 * CONFIGURACAO DE VARIAVEIS DE AMBIENTE
 * ========================================
 * 
 * As variaveis do Supabase sao configuradas automaticamente quando voce
 * conecta a integracao no v0. Caso precise configurar manualmente:
 * 
 * 1. Acesse seu projeto no Supabase Dashboard
 * 2. Va em Settings > API
 * 3. Copie:
 *    - Project URL -> NEXT_PUBLIC_SUPABASE_URL
 *    - anon/public key -> NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * IMPORTANTE: NUNCA use a service_role key no frontend!
 * 
 * ========================================
 * COMO FUNCIONA O FALLBACK
 * ========================================
 * 
 * Todos os servicos implementam fallback automatico:
 * 
 * 1. NEIGHBORHOODS:
 *    - Se Supabase falhar -> usa FALLBACK_NEIGHBORHOODS
 *    - O checkout continua funcionando normalmente
 *    - Indicador visual mostra "(teste)" nos bairros fallback
 * 
 * 2. ORDERS:
 *    - Se Supabase falhar -> salva em localStorage
 *    - O pedido NAO e perdido
 *    - Checkout e PIX continuam funcionando
 * 
 * ========================================
 * MIGRACAO BLOB -> SUPABASE
 * ========================================
 * 
 * Para migrar os dados do Blob para Supabase:
 * 
 * 1. BAIRROS:
 *    - Busque os bairros atuais via /api/site-config
 *    - Chame saveNeighborhoods() com os dados
 *    - Altere getNeighborhoodFees() no page.tsx para usar fetchNeighborhoods()
 * 
 * 2. PEDIDOS:
 *    - Os pedidos novos ja serao salvos no Supabase
 *    - Pedidos antigos do Blob podem ser migrados via script
 *    - Use saveOrderToSupabase() para cada pedido antigo
 * 
 * 3. CONFIGURACOES:
 *    - Crie uma tabela 'site_config' no Supabase
 *    - Migre storeName, delivery, products, etc.
 *    - Altere /api/site-config para usar Supabase
 * 
 * ========================================
 * USO DOS SERVICOS
 * ========================================
 * 
 * // Buscar bairros (com fallback automatico)
 * import { fetchNeighborhoods } from '@/lib/supabase'
 * const { data, isFallback } = await fetchNeighborhoods()
 * 
 * // Salvar pedido (nao quebra se falhar)
 * import { saveOrderToSupabase } from '@/lib/supabase'
 * await saveOrderToSupabase(orderData)
 * 
 * // Buscar pedidos do cliente
 * import { fetchOrdersByPhone } from '@/lib/supabase'
 * const { data, source } = await fetchOrdersByPhone('11999999999')
 */

// Clientes Supabase
export { createClient, getSupabaseClient, isSupabaseConfigured } from './client'

// Tipos
export type { 
  DbNeighborhood, 
  DbOrder, 
  CreateOrderInput, 
  UpdateOrderInput,
  OrderItem,
  OrderStatus 
} from './types'

// Servico de Bairros
export { 
  fetchNeighborhoods, 
  fetchNeighborhoodByName,
  saveNeighborhoods,
  type NeighborhoodResult 
} from './neighborhoods'

// Servico de Pedidos
export { 
  saveOrderToSupabase,
  fetchOrdersByPhone,
  fetchAllOrders,
  updateOrderStatus,
  updateOrder,
  fetchOrderById,
  type OrderResult,
  type OrdersListResult
} from './orders'
