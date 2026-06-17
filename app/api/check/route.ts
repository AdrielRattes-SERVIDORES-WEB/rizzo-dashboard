import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/supabase'

// Checa estoque dos produtos mapeados no Amazon e retorna alertas
export async function GET() {
  const sb = serverSupabase()
  const { data: mapped } = await sb
    .from('amazon_rizzo_map')
    .select('*, rizzo_products(*)')
    .eq('active', true)
    .not('rizzo_url', 'is', null)

  if (!mapped) return NextResponse.json({ error: 'no mapped products' })

  const alerts = mapped
    .filter(m => {
      const stock = m.rizzo_products?.stock ?? 0
      return stock <= (m.alert_threshold ?? 5)
    })
    .map(m => ({
      sku: m.amazon_sku,
      asin: m.amazon_asin,
      title: m.rizzo_products?.name,
      stock: m.rizzo_products?.stock,
      threshold: m.alert_threshold,
      url: m.rizzo_url,
    }))

  return NextResponse.json({
    total: mapped.length,
    alerts: alerts.length,
    items: alerts,
  })
}
