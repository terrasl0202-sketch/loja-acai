"use client"

import { useEffect, useState } from "react"
import { Star, Quote } from "lucide-react"

interface Review {
  id: number
  rating: number
  product_rating: number | null
  delivery_rating: number | null
  comment: string | null
  created_at: string
  orders?: {
    customer_name: string
  }
}

interface ReviewStats {
  total: number
  averageRating: string | number
}

export function PublicReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/reviews?visible=true")
        const data = await res.json()
        if (data.success) {
          setReviews(data.reviews?.slice(0, 6) || [])
          setStats(data.stats || null)
        }
      } catch {
        // Silencioso
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return null
  if (!stats || stats.total === 0) return null

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  )

  const getInitials = (name?: string) => {
    if (!name) return "?"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Hoje"
    if (diffDays === 1) return "Ontem"
    if (diffDays < 7) return `Ha ${diffDays} dias`
    if (diffDays < 30) return `Ha ${Math.floor(diffDays / 7)} semanas`
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  }

  return (
    <section className="py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Avaliacoes dos Clientes</h2>
            <p className="text-sm text-muted-foreground">
              {stats.total} avaliacao{stats.total !== 1 ? "es" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-2 rounded-xl">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="text-xl font-bold text-yellow-500">{stats.averageRating}</span>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card rounded-xl border border-border p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {getInitials(review.orders?.customer_name)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground truncate">
                      {review.orders?.customer_name || "Cliente"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="mb-2">{renderStars(review.rating)}</div>

                  {/* Comment */}
                  {review.comment && (
                    <div className="relative">
                      <Quote className="w-3 h-3 text-muted-foreground/30 absolute -left-1 -top-1" />
                      <p className="text-sm text-muted-foreground pl-3 italic">
                        {review.comment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
