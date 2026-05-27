/**
 * @module Bridge Index
 * @description Ponte de compatibilidade para migracao gradual
 * 
 * @example
 * // Em componentes sendo migrados:
 * import { storeService, fetchStoreStatusBridge } from '@/lib/bridge'
 * 
 * // Usar bridge para compatibilidade
 * const { data } = await fetchStoreStatusBridge()
 * 
 * // Ou usar service diretamente (preferido)
 * const settings = await storeService.getSettings()
 */

export * from './legacy-bridge'
