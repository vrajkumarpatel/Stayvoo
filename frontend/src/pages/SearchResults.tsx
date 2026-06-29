import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import HotelCard from '../components/HotelCard'
import SearchBar from '../components/SearchBar'
import { searchHotels } from '../lib/api'

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const checkin = searchParams.get('checkin_date') ?? ''
  const checkout = searchParams.get('checkout_date') ?? ''
  const guests = Number(searchParams.get('guests') ?? 1)

  const [results, setResults] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!checkin || !checkout) { setLoading(false); return }
    setLoading(true)
    setError(null)
    searchHotels({ checkin_date: checkin, checkout_date: checkout, guests })
      .then(data => {
        setResults(data.results ?? [])
        setMeta(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [checkin, checkout, guests])

  const nights = checkin && checkout
    ? Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
    : 1

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      {/* Search bar header */}
      <div className="bg-[#1e3a5f] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <SearchBar inline />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Result summary */}
        {!loading && !error && meta && (
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-[#1e3a5f] font-black text-2xl">
                {meta.total ?? results.length} Hotels Available
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {checkin} → {checkout} · {guests} {guests === 1 ? 'guest' : 'guests'} · {nights} {nights === 1 ? 'night' : 'nights'}
              </p>
            </div>
            {meta.exclusive_count > 0 && (
              <span className="bg-orange-100 text-orange-600 text-sm font-bold px-3 py-1.5 rounded-full">
                ⭐ {meta.exclusive_count} exclusive {meta.exclusive_count === 1 ? 'hotel' : 'hotels'}
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-red-600 font-semibold">{error}</p>
            <Link to="/" className="mt-4 inline-block text-orange-500 font-semibold hover:text-orange-600">← Back to Home</Link>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">🏨</div>
            <h2 className="text-[#1e3a5f] font-bold text-xl">No hotels found</h2>
            <p className="text-slate-500 mt-2">Try different dates or fewer guests.</p>
            <Link to="/" className="mt-5 inline-block bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition-colors">← New Search</Link>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            {/* Exclusive hotels first */}
            {results.some((h: any) => h.exclusive) && (
              <div className="mb-10">
                <h2 className="text-[#1e3a5f] font-bold text-lg mb-4 flex items-center gap-2">
                  <span>⭐</span> Exclusive Partner Hotels
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.filter((h: any) => h.exclusive).map((h: any) => (
                    <HotelCard key={h.id ?? h.hotel_id} hotel={h} />
                  ))}
                </div>
              </div>
            )}

            {/* Other hotels */}
            {results.some((h: any) => !h.exclusive) && (
              <div>
                <h2 className="text-[#1e3a5f] font-bold text-lg mb-4">Other Options Nearby</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.filter((h: any) => !h.exclusive).map((h: any) => (
                    <HotelCard key={h.id ?? h.hotel_id} hotel={h} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
