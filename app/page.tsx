import { serverSupabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 300 // revalida a cada 5 min

type Product = {
  product_id: string
  ean: string | null
  name: string
  url: string
  category: string | null
  price: number | null
  stock: number
  available: boolean
  images: string[]
  last_checked: string
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-900 text-red-300">ESGOTADO</span>
  if (stock <= 5)  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-900 text-orange-300">{stock} un ⚠️</span>
  if (stock <= 20) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-900 text-yellow-300">{stock} un</span>
  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-900 text-green-300">{stock} un</span>
}

export default async function Home({
  searchParams,
}: {
  searchParams: { q?: string; cat?: string; status?: string; page?: string }
}) {
  const sb = serverSupabase()
  const page = parseInt(searchParams.page || '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = sb
    .from('rizzo_products')
    .select('*', { count: 'exact' })
    .order('stock', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (searchParams.q) {
    query = query.ilike('name', `%${searchParams.q}%`)
  }
  if (searchParams.cat) {
    query = query.eq('category', searchParams.cat)
  }
  if (searchParams.status === 'esgotado') {
    query = query.eq('stock', 0)
  } else if (searchParams.status === 'critico') {
    query = query.gt('stock', 0).lte('stock', 5)
  } else if (searchParams.status === 'ok') {
    query = query.gt('stock', 5)
  }

  const { data: products, count, error } = await query

  // Stats
  const { data: statsData } = await sb
    .from('rizzo_products')
    .select('stock, available')

  const stats = {
    total: statsData?.length || 0,
    esgotados: statsData?.filter(p => p.stock === 0).length || 0,
    criticos: statsData?.filter(p => p.stock > 0 && p.stock <= 5).length || 0,
    ok: statsData?.filter(p => p.stock > 5).length || 0,
  }

  const totalPages = Math.ceil((count || 0) / pageSize)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Rizzo Estoque</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor em tempo real dos produtos Rizzo Embalagens</p>
        </div>
        <Link href="/api/check" className="text-xs text-gray-500 hover:text-gray-300">
          Forçar check
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="blue" />
        <StatCard label="Esgotados" value={stats.esgotados} color="red" />
        <StatCard label="Críticos (≤5)" value={stats.criticos} color="orange" />
        <StatCard label="Em estoque" value={stats.ok} color="green" />
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 mb-6">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Buscar produto..."
          className="flex-1 min-w-40 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <select
          name="status"
          defaultValue={searchParams.status}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
        >
          <option value="">Todos</option>
          <option value="esgotado">Esgotado</option>
          <option value="critico">Crítico (≤5)</option>
          <option value="ok">OK</option>
        </select>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
          Filtrar
        </button>
        <Link href="/" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">
          Limpar
        </Link>
      </form>

      {/* Tabela */}
      {error ? (
        <div className="bg-red-900/30 border border-red-700 rounded p-4 text-red-300">
          Tabelas ainda não criadas. Rode o SQL de migração no Supabase Dashboard.
        </div>
      ) : (
        <>
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-4 py-3">Produto</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Preço</th>
                  <th className="text-left px-4 py-3">Estoque</th>
                  <th className="text-left px-4 py-3">Checado</th>
                  <th className="text-left px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {(products || []).map((p: Product, i: number) => {
                  const img = p.images?.[0]
                  const checkedAt = p.last_checked
                    ? new Date(p.last_checked).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
                    : '-'
                  return (
                    <tr key={p.product_id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-2 text-gray-500">{offset + i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {img && (
                            <img src={img} alt="" className="w-8 h-8 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <div>
                            <div className="text-white font-medium leading-tight">{p.name.slice(0, 60)}</div>
                            {p.ean && <div className="text-gray-500 text-xs">{p.ean}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs">{p.category || '-'}</td>
                      <td className="px-4 py-2 text-gray-300 text-xs">
                        {p.price ? `R$${p.price.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <StockBadge stock={p.stock} />
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{checkedAt}</td>
                      <td className="px-4 py-2">
                        <a href={p.url} target="_blank" rel="noreferrer"
                           className="text-blue-400 hover:text-blue-300 text-xs">
                          Rizzo ↗
                        </a>
                      </td>
                    </tr>
                  )
                })}
                {(!products || products.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      Nenhum produto encontrado. Execute o crawler para popular o banco.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {page > 1 && (
                <Link href={`/?page=${page - 1}&q=${searchParams.q || ''}&status=${searchParams.status || ''}`}
                      className="px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700">
                  ← Anterior
                </Link>
              )}
              <span className="text-gray-400 text-sm">Página {page} de {totalPages} ({count} produtos)</span>
              {page < totalPages && (
                <Link href={`/?page=${page + 1}&q=${searchParams.q || ''}&status=${searchParams.status || ''}`}
                      className="px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700">
                  Próxima →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-700 text-blue-300',
    red: 'border-red-700 text-red-300',
    orange: 'border-orange-700 text-orange-300',
    green: 'border-green-700 text-green-300',
  }
  return (
    <div className={`bg-gray-900 border rounded-lg p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
    </div>
  )
}
