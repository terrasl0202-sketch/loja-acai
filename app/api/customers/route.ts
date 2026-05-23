import { put, list } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"
import { type Customer } from "@/lib/config-types"

const CUSTOMERS_PREFIX = "pk-customers-"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

// Funcao para gerar ID unico
function generateId(): string {
  return `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Funcao para carregar clientes (otimizada com fetch)
async function loadCustomers(): Promise<Customer[]> {
  try {
    const { blobs } = await list({ prefix: CUSTOMERS_PREFIX })
    if (blobs.length === 0) return []
    
    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0]
    
    const response = await fetch(latestBlob.url)
    if (response.ok) {
      const text = await response.text()
      return JSON.parse(text)
    }
  } catch (error) {
    console.error("Erro ao carregar clientes:", error)
  }
  return []
}

// Funcao para salvar clientes
async function saveCustomers(customers: Customer[]): Promise<void> {
  const fileName = `${CUSTOMERS_PREFIX}${Date.now()}.json`
  await put(fileName, JSON.stringify(customers), {
    access: "private",
    contentType: "application/json",
  })
}

// GET - Buscar cliente por telefone
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get("phone")
    
    if (!phone) {
      return NextResponse.json({ error: "Telefone obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }
    
    // Normalizar telefone (apenas numeros)
    const normalizedPhone = phone.replace(/\D/g, "")
    
    const customers = await loadCustomers()
    const customer = customers.find(c => c.phone.replace(/\D/g, "") === normalizedPhone)
    
    if (!customer) {
      return NextResponse.json({ found: false }, { headers: noCacheHeaders })
    }
    
    // Retornar dados publicos (sem PIN)
    const { pin, ...publicData } = customer
    return NextResponse.json({ found: true, customer: publicData }, { headers: noCacheHeaders })
    
  } catch (error) {
    console.error("Erro ao buscar cliente:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}

// POST - Login ou criar conta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, phone, name, pin } = body
    
    if (!phone) {
      return NextResponse.json({ error: "Telefone obrigatorio" }, { status: 400, headers: noCacheHeaders })
    }
    
    const normalizedPhone = phone.replace(/\D/g, "")
    const customers = await loadCustomers()
    const existingIndex = customers.findIndex(c => c.phone.replace(/\D/g, "") === normalizedPhone)
    
    // ACAO: Criar conta
    if (action === "register") {
      if (!name || !pin) {
        return NextResponse.json({ error: "Nome e PIN obrigatorios" }, { status: 400, headers: noCacheHeaders })
      }
      
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ error: "PIN deve ter 4 digitos" }, { status: 400, headers: noCacheHeaders })
      }
      
      if (existingIndex >= 0) {
        return NextResponse.json({ error: "Telefone ja cadastrado" }, { status: 400, headers: noCacheHeaders })
      }
      
      const newCustomer: Customer = {
        id: generateId(),
        name,
        phone: normalizedPhone,
        pin,
        createdAt: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0,
        isVip: false,
        favorites: [],
      }
      
      customers.push(newCustomer)
      await saveCustomers(customers)
      
      const { pin: _, ...publicData } = newCustomer
      return NextResponse.json({ 
        success: true, 
        customer: publicData,
        message: "Conta criada com sucesso!"
      }, { headers: noCacheHeaders })
    }
    
    // ACAO: Login
    if (action === "login") {
      if (!pin) {
        return NextResponse.json({ error: "PIN obrigatorio" }, { status: 400, headers: noCacheHeaders })
      }
      
      if (existingIndex < 0) {
        return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404, headers: noCacheHeaders })
      }
      
      const customer = customers[existingIndex]
      if (customer.pin !== pin) {
        return NextResponse.json({ error: "PIN incorreto" }, { status: 401, headers: noCacheHeaders })
      }
      
      const { pin: _, ...publicData } = customer
      return NextResponse.json({ 
        success: true, 
        customer: publicData,
        message: "Login realizado!"
      }, { headers: noCacheHeaders })
    }
    
    // ACAO: Atualizar dados
    if (action === "update") {
      if (existingIndex < 0) {
        return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404, headers: noCacheHeaders })
      }
      
      const customer = customers[existingIndex]
      
      // Atualizar nome se fornecido
      if (body.newName) {
        customer.name = body.newName
      }
      
      // Atualizar endereco se fornecido
      if (body.savedAddress) {
        customer.savedAddress = body.savedAddress
      }
      
      // Atualizar favoritos se fornecido
      if (body.favorites !== undefined) {
        customer.favorites = body.favorites
      }
      
      // Toggle favorito
      if (body.toggleFavorite !== undefined) {
        const productId = body.toggleFavorite
        const index = customer.favorites.indexOf(productId)
        if (index >= 0) {
          customer.favorites.splice(index, 1)
        } else {
          customer.favorites.push(productId)
        }
      }
      
      await saveCustomers(customers)
      
      const { pin: _, ...publicData } = customer
      return NextResponse.json({ 
        success: true, 
        customer: publicData 
      }, { headers: noCacheHeaders })
    }
    
    // ACAO: Registrar pedido (atualizar estatisticas)
    if (action === "recordOrder") {
      if (existingIndex < 0) {
        return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404, headers: noCacheHeaders })
      }
      
      const { orderTotal } = body
      const customer = customers[existingIndex]
      
      customer.totalOrders += 1
      customer.totalSpent += orderTotal || 0
      customer.lastOrderAt = new Date().toISOString()
      
      // Cliente VIP = 5+ pedidos
      if (customer.totalOrders >= 5) {
        customer.isVip = true
      }
      
      await saveCustomers(customers)
      
      const { pin: _, ...publicData } = customer
      return NextResponse.json({ 
        success: true, 
        customer: publicData 
      }, { headers: noCacheHeaders })
    }
    
    return NextResponse.json({ error: "Acao invalida" }, { status: 400, headers: noCacheHeaders })
    
  } catch (error) {
    console.error("Erro ao processar cliente:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: noCacheHeaders })
  }
}
