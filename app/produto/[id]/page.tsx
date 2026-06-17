import { serverSupabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

export default async function ProductPage({ params }: { params: { id: string } }) {
  const sb = serverSupabase()
  const { data: product } = await sb
    .from('rizzo_products')
    .select('*')
    .eq('product_id', params.id)
    .single()

  if (!product) notFound()

  const { data: history } = await sb
    .from('rizzo_stock_history')
    .select('stock, price, checked_at')
    .eq('product_id', params.id)
    .order('checked_at', { ascending: false })
    .limit(30)

  const { data: amazonMap } = await sb
    .from('amazon_rizzo_map')
    .select('amazon_sku, amazon_asin, amazon_title, alert_threshold')
    .eq('rizzo_product_id', params.id)
    .single()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm mb-6 inline-block">← Voltar</Link>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex gap-6">
          {product.images?.[0] && (
            <img src={product.images[0]} alt="" className="w-32 h-32 object-cover rounded-lg" />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{product.name}</h1>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div><span className="text-gray-400">EAN:</span> <span className="text-gray-200">{product.ean || '-'}</span></div>
              <div><span className="text-gray-400">Categoria:</span> <span className="text-gray-200">{product.category || '-'}</span></div>
              <div><span className="text-gray-400">Preço:</span> <span className="text-gray-200">{product.price ? `R$${product.price.toFixed(2)}` : '-'}</span></div>
              <div>
                <span className="text-gray-400">Estoque:</span>{' '}
                <span className={`font-bold ${product.stock === 0 ? 'text-red-400' : product.stock <= 5 ? 'text-orange-400' : 'text-green-400'}`}>
                  {product.stock} unidades
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">URL:</span>{' '}
                <a href={product.url} target="_blank" className="text-blue-400 hover:text-blue-300">{product.url}</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {amazonMap && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">Amazon</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-400">SKU:</span> <span className="text-gray-200">{amazonMap.amazon_sku}</span></div>
            <div><span className="text-gray-400">ASIN:</span> <span className="text-gray-200">{amazonMap.amazon_asin || '-'}</span></div>
            <div className="col-span-2"><span className="text-gray-400">Título:</span> <span className="text-gray-200">{amazonMap.amazon_title || '-'}</span></div>
            <div><span className="text-gray-400">Alerta quando estoque ≤</span> <span className="text-orange-300 font-bold">{amazonMap.alert_threshold} un</span></div>
          </div>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Histórico de estoque</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left py-2">Data</th>
                <th className="text-left py-2">Estoque</th>
                <th className="text-left py-2">Preço</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-2 text-gray-400">
                    {new Date(h.checked_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </td>
                  <td className={`py-2 font-bold ${h.stock === 0 ? 'text-red-400' : h.stock <= 5 ? 'text-orange-400' : 'text-green-400'}`}>
                    {h.stock}
                  </td>
                  <td className="py-2 text-gray-300">{h.price ? `R$${h.price.toFixed(2)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
