import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface BookingCard {
  hotelName: string
  hotelId: string
  roomId: string
  checkin: string
  checkout: string
  pricePerNight: number
  guests: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
  initial?: boolean
  bookingCard?: BookingCard
}

const GREETING: Message = {
  role: 'assistant',
  content: "Hi! I'm Stayvo, your hotel assistant 🏨 I can help you find the perfect hotel and guide you to book directly. What brings you to Waukesha or Brookfield?",
  ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  initial: true,
}

const BOOKING_KEYWORDS = [
  'complete your booking',
  'click the link below',
  'takes 2 minutes',
  'you pay at hotel',
  'no charge today',
]

const HOTEL_PATTERNS: Array<{ keywords: string[]; nameFragment: string }> = [
  { keywords: ['choice', '110', 'breakfast', 'cheapest', 'pet'], nameFragment: 'choice' },
  { keywords: ['brookfield', 'froedtert', 'aurora'], nameFragment: 'brookfield' },
  { keywords: ['wyndham waukesha', 'waukesha wyndham', '115'], nameFragment: 'waukesha' },
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function BookingCardUI({ card }: { card: BookingCard }) {
  const nights = Math.max(1, Math.round(
    (new Date(card.checkout).getTime() - new Date(card.checkin).getTime()) / 86400000
  ))
  const params = new URLSearchParams({
    hotel_id: card.hotelId,
    room_id: card.roomId,
    checkin: card.checkin,
    checkout: card.checkout,
  })
  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="bg-white border-2 border-orange-100 rounded-2xl p-4 shadow-sm w-full max-w-[90%] text-sm mt-1">
      <div className="font-bold text-[#1e3a5f] text-sm mb-2">🏨 {card.hotelName}</div>
      <div className="flex flex-col gap-1 text-xs text-slate-600 mb-3">
        <div className="flex justify-between">
          <span>Check-in</span>
          <span className="font-semibold text-[#1e3a5f]">{formatDate(card.checkin)}</span>
        </div>
        <div className="flex justify-between">
          <span>Check-out</span>
          <span className="font-semibold text-[#1e3a5f]">{formatDate(card.checkout)}</span>
        </div>
        <div className="flex justify-between">
          <span>{card.guests} Guest · ${card.pricePerNight}/night</span>
          {nights > 1 && <span className="font-semibold">${card.pricePerNight * nights} total</span>}
        </div>
      </div>
      <Link
        to={`/book?${params}`}
        className="flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors w-full"
      >
        Complete Booking →
      </Link>
    </div>
  )
}

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${BASE}/hotels`).then(r => r.json()).then(setHotels).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildHistory = () =>
    messages
      .filter(m => !m.initial)
      .map(m => ({ role: m.role, content: m.content }))

  const now = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const detectBookingCard = (responseText: string, priorMessages: Message[]): BookingCard | null => {
    if (hotels.length === 0) return null
    const lower = responseText.toLowerCase()
    const hasBookingIntent = BOOKING_KEYWORDS.some(kw => lower.includes(kw))
    if (!hasBookingIntent) return null

    // Scan recent conversation for hotel context
    const contextText = [...priorMessages.slice(-8), { content: responseText }]
      .map(m => m.content)
      .join(' ')
      .toLowerCase()

    let matched = hotels[0]
    for (const pattern of HOTEL_PATTERNS) {
      if (pattern.keywords.some(kw => contextText.includes(kw))) {
        const found = hotels.find(h => h.name.toLowerCase().includes(pattern.nameFragment))
        if (found) { matched = found; break }
      }
    }

    // Extract ISO dates from context
    const dateMatches = contextText.match(/\d{4}-\d{2}-\d{2}/g) ?? []
    const checkin = dateMatches[0] ?? today
    const checkout = dateMatches[1] ?? tomorrow

    // Extract guest count
    const guestMatch = contextText.match(/(\d+)\s*(guest|person|people|room)/)
    const guests = guestMatch ? Math.min(parseInt(guestMatch[1]), 10) : 1

    const room = matched?.rooms?.[0]
    if (!matched || !room) return null

    return {
      hotelName: matched.name,
      hotelId: matched.id,
      roomId: room.id,
      checkin,
      checkout,
      pricePerNight: room.price_per_night,
      guests,
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text, ts: now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const r = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_history: buildHistory() }),
      })
      const data = await r.json()

      setMessages(prev => {
        const card = detectBookingCard(data.response, [...prev, userMsg])
        const aiMsg: Message = {
          role: 'assistant',
          content: data.response,
          ts: now(),
          bookingCard: card ?? undefined,
        }
        return [...prev, aiMsg]
      })
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting. Call us at +1 (888) 352-8151 and we'll help right away!",
        ts: now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden"
          style={{ width: 350, height: 500 }}
        >
          {/* Header */}
          <div className="bg-[#1e3a5f] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-lg">🏨</div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Stayvo AI Assistant</p>
                <p className="text-white/50 text-xs mt-0.5">Usually replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-0.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-white text-slate-700 shadow-sm rounded-bl-sm'
                    }`}
                >
                  {m.content}
                </div>
                {m.bookingCard && <BookingCardUI card={m.bookingCard} />}
                <span className="text-slate-400 text-[10px] px-1">{m.ts}</span>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start gap-0.5">
                <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm">
                  <TypingDots />
                </div>
                <span className="text-slate-400 text-[10px] px-1">Stayvo is typing...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-slate-100 px-3 py-3 flex gap-2 items-center flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything about hotels..."
              disabled={loading}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl p-2.5 transition-colors flex-shrink-0"
              aria-label="Send"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-4 sm:right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xl hover:shadow-orange-200 transition-all flex items-center justify-center text-2xl"
        aria-label="Open chat"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="relative">
            💬
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </span>
        )}
      </button>
    </>
  )
}
