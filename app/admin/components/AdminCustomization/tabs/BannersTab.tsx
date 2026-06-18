"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Image as ImageIcon, Save, Loader2 } from "lucide-react"

interface Banner {
  id: number
  imageUrl: string
  title: string
  subtitle: string
  linkUrl: string
  sortOrder: number
  active: boolean
}

export function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedBanner, setExpandedBanner] = useState<number | null>(null)

  // Carregar banners
  useEffect(() => {
    fetch('/api/banners')
      .then(res => res.json())
      .then(data => {
        setBanners(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('[BannersTab] Erro ao carregar:', err)
        setLoading(false)
      })
  }, [])

  // Adicionar banner
  const addBanner = async () => {
    if (banners.length >= 5) {
      alert('Limite de 5 banners atingido')
      return
    }

    try {
      const res = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: '',
          title: 'Novo Banner',
          subtitle: '',
          active: true,
        }),
      })
      const newBanner = await res.json()
      if (newBanner.id) {
        setBanners([...banners, newBanner])
        setExpandedBanner(newBanner.id)
      }
    } catch (err) {
      console.error('[BannersTab] Erro ao adicionar:', err)
    }
  }

  // Atualizar banner local
  const updateBanner = (id: number, field: keyof Banner, value: string | boolean | number) => {
    setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b))
    setHasChanges(true)
  }

  // Mover banner
  const moveBanner = (id: number, direction: 'up' | 'down') => {
    const index = banners.findIndex(b => b.id === id)
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= banners.length) return
    
    const newBanners = [...banners]
    const temp = newBanners[index]
    newBanners[index] = newBanners[newIndex]
    newBanners[newIndex] = temp
    
    // Atualizar sortOrder
    newBanners.forEach((b, i) => {
      b.sortOrder = i + 1
    })
    
    setBanners(newBanners)
    setHasChanges(true)
  }

  // Excluir banner
  const deleteBanner = async (id: number) => {
    if (!confirm('Excluir este banner?')) return
    
    try {
      await fetch(`/api/banners?id=${id}`, { method: 'DELETE' })
      setBanners(banners.filter(b => b.id !== id))
    } catch (err) {
      console.error('[BannersTab] Erro ao excluir:', err)
    }
  }

  // Salvar alteracoes
  const saveChanges = async () => {
    setSaving(true)
    try {
      await fetch('/api/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banners),
      })
      setHasChanges(false)
    } catch (err) {
      console.error('[BannersTab] Erro ao salvar:', err)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Banner Carousel</h3>
          <p className="text-sm text-muted-foreground">
            Adicione ate 5 banners para o carousel do hero
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={saveChanges}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          )}
          <button
            onClick={addBanner}
            disabled={banners.length >= 5}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Novo Banner
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <strong>Dica:</strong> Se houver apenas 1 banner ativo, ele sera exibido normalmente. 
        Com 2 ou mais banners ativos, sera exibido um carousel com autoplay.
      </div>

      {/* Lista de Banners */}
      {banners.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum banner cadastrado</p>
          <button
            onClick={addBanner}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            Adicionar Primeiro Banner
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`border rounded-xl transition-all ${
                expandedBanner === banner.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {/* Header do banner */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedBanner(expandedBanner === banner.id ? null : banner.id)}
              >
                {/* Preview */}
                <div className="w-20 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {banner.title || 'Sem titulo'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {banner.subtitle || 'Sem subtitulo'}
                  </p>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => updateBanner(banner.id, 'active', !banner.active)}
                    className={`p-2 rounded-lg transition-colors ${
                      banner.active ? "text-green-500" : "text-muted-foreground"
                    }`}
                    title={banner.active ? "Desativar" : "Ativar"}
                  >
                    {banner.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => moveBanner(banner.id, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveBanner(banner.id, 'down')}
                    disabled={index === banners.length - 1}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteBanner(banner.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Campos expandidos */}
              {expandedBanner === banner.id && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <label className="text-xs text-muted-foreground">URL da Imagem *</label>
                    <input
                      type="text"
                      value={banner.imageUrl}
                      onChange={(e) => updateBanner(banner.id, 'imageUrl', e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Titulo</label>
                      <input
                        type="text"
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                        placeholder="Titulo do banner"
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Subtitulo</label>
                      <input
                        type="text"
                        value={banner.subtitle}
                        onChange={(e) => updateBanner(banner.id, 'subtitle', e.target.value)}
                        placeholder="Subtitulo ou descricao"
                        className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Link (opcional)</label>
                    <input
                      type="text"
                      value={banner.linkUrl}
                      onChange={(e) => updateBanner(banner.id, 'linkUrl', e.target.value)}
                      placeholder="https://exemplo.com/pagina"
                      className="w-full mt-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Preview grande */}
                  {banner.imageUrl && (
                    <div>
                      <label className="text-xs text-muted-foreground">Preview</label>
                      <div className="mt-1 relative h-40 rounded-xl overflow-hidden bg-muted">
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4">
                          <p className="text-white font-bold text-lg drop-shadow-lg">{banner.title}</p>
                          <p className="text-white/80 text-sm drop-shadow">{banner.subtitle}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contador */}
      <div className="text-center text-sm text-muted-foreground">
        {banners.length}/5 banners cadastrados
        {banners.filter(b => b.active).length > 0 && (
          <span> ({banners.filter(b => b.active).length} ativos)</span>
        )}
      </div>
    </div>
  )
}
