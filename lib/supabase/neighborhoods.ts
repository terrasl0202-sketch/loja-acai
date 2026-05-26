/**
 * Servico de Bairros (Neighborhoods)
 * 
 * Este servico gerencia os bairros e taxas de entrega.
 * Inclui fallback local para quando Supabase nao estiver disponivel.
 * 
 * FALLBACK: Se Supabase falhar, usa FALLBACK_NEIGHBORHOODS definido abaixo.
 * Isso garante que o sistema NUNCA quebra mesmo sem conexao.
 * 
 * MIGRACAO DO BLOB: Para migrar do Blob para Supabase:
 * 1. Exporte os bairros do Blob via /api/site-config
 * 2. Insira no Supabase via este servico (saveNeighborhoods)
 * 3. Altere getNeighborhoodFees() no page.tsx para usar fetchNeighborhoods()
 */

import { createClient } from '@/lib/supabase/client'
import type { DbNeighborhood } from './types'

// Bairros fallback - usados quando Supabase falha
// Mantenha sincronizado com FALLBACK_NEIGHBORHOOD_FEES em constants
const FALLBACK_NEIGHBORHOODS: DbNeighborhood[] = [
  { id: '1', name: 'Centro', fee: 5.00, active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Bairro Norte', fee: 6.00, active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Bairro Sul', fee: 6.00, active: true, created_at: '', updated_at: '' },
  { id: '4', name: 'Bairro Teste', fee: 5.00, active: true, created_at: '', updated_at: '' },
]

export interface NeighborhoodResult {
  data: DbNeighborhood[]
  isFallback: boolean
  error: string | null
}

/**
 * Busca todos os bairros ativos do Supabase
 * Retorna fallback local se houver erro
 */
export async function fetchNeighborhoods(): Promise<NeighborhoodResult> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('active', true)
      .order('name')
    
    if (error) {
      console.error('[Supabase] Erro ao buscar bairros:', error.message)
      return {
        data: FALLBACK_NEIGHBORHOODS,
        isFallback: true,
        error: error.message
      }
    }
    
    // Se nao houver dados, usa fallback
    if (!data || data.length === 0) {
      return {
        data: FALLBACK_NEIGHBORHOODS,
        isFallback: true,
        error: null
      }
    }
    
    return {
      data: data as DbNeighborhood[],
      isFallback: false,
      error: null
    }
  } catch (err) {
    console.error('[Supabase] Excecao ao buscar bairros:', err)
    return {
      data: FALLBACK_NEIGHBORHOODS,
      isFallback: true,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    }
  }
}

/**
 * Busca um bairro especifico pelo nome
 */
export async function fetchNeighborhoodByName(name: string): Promise<DbNeighborhood | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .ilike('name', name)
      .single()
    
    if (error || !data) {
      // Tenta fallback
      const fallback = FALLBACK_NEIGHBORHOODS.find(
        n => n.name.toLowerCase() === name.toLowerCase()
      )
      return fallback || null
    }
    
    return data as DbNeighborhood
  } catch {
    return null
  }
}

/**
 * Salva/atualiza bairros no Supabase (upsert)
 * Usado para migrar dados do Blob
 */
export async function saveNeighborhoods(neighborhoods: Omit<DbNeighborhood, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('neighborhoods')
      .upsert(
        neighborhoods.map(n => ({
          name: n.name,
          fee: n.fee,
          active: n.active,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'name' }
      )
    
    if (error) {
      console.error('[Supabase] Erro ao salvar bairros:', error.message)
      return false
    }
    
    return true
  } catch (err) {
    console.error('[Supabase] Excecao ao salvar bairros:', err)
    return false
  }
}
