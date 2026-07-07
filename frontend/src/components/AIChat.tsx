import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CheckCircle2, Gift, Phone, X } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface BookingCard {
  hotelName: string
  hotelId: string
  price: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
  initial?: boolean
  bookingCard?: BookingCard
}

interface GroupFlow {
  step: 1 | 2 | 3 | 4
  name: string
  email: string
  rooms: string
}

function isGroupInquiry(text: string): boolean {
  const lower = text.toLowerCase()
  const roomMatch = lower.match(/(\d+)\s*rooms?/)
  if (roomMatch && parseInt(roomMatch[1]) >= 5) return true
  return (
    /construction crew|construction team|construction workers/.test(lower) ||
    /\bgroup\b/.test(lower) ||
    /travel nurse agenc/.test(lower) ||
    /corporate team/.test(lower)
  )
}

const GREETING_TEXT =
  `Hi! I'm Stayvo 🏨\nHotels in Waukesha from $110/night.\nWhich works for you?\n\n• Choice Hotels — $110/night\n• Wyndham Waukesha — $115/night\n• Wyndham Brookfield — $120/night\n\nOr ask me anything!`

const QUICK_REPLIES = [
  { label: 'Cheapest Option', message: 'What is the cheapest option?' },
  { label: 'Near Froedtert', message: 'I need a hotel near Froedtert' },
  { label: 'Group Booking', message: 'I need rooms for a group' },
]

// Hotel name → pattern for matching against fetched hotel list
const HOTEL_NAME_PATTERNS: Record<string, string> = {
  'Choice Hotels Waukesha': 'choice',
  'Wyndham Waukesha': 'wyndham waukesha',
  'Wyndham Brookfield': 'wyndham brookfield',
}

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
  return (
    <div className="bg-white border-2 border-orange-100 rounded-2xl p-4 shadow-sm w-full mt-1.5">
      <div className="font-bold text-[#10192b] text-sm mb-2 flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {card.hotelName}</div>
      <div className="flex flex-col gap-1 text-xs text-slate-600 mb-3">
        <div className="font-semibold text-base text-[#10192b]">From ${card.price}/night</div>
        <div className="flex items-center gap-1.5 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Pay at hotel — no charge today</div>
        <div className="flex items-center gap-1.5 text-orange-600"><Gift className="w-3.5 h-3.5" /> Welcome kit included</div>
      </div>
      <Link
        to={`/book?hotel_id=${card.hotelId}`}
        className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-3 rounded-xl transition-colors w-full"
      >
        Book Now →
      </Link>
    </div>
  )
}

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(true)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: GREETING_TEXT,
    ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    initial: true,
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hotels, setHotels] = useState<any[]>([])
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(true)
  const [groupFlow, setGroupFlow] = useState<GroupFlow | null>(null)
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

  const addAIMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content, ts: now() }])
  }

  const triggerGroupFlow = () => {
    setLoading(true)
    setTimeout(() => {
      addAIMessage(
        "I can help with that group booking! Let me get a few quick details to get you the best rate.\n\nWhat is your name?"
      )
      setGroupFlow({ step: 1, name: '', email: '', rooms: '' })
      setLoading(false)
    }, 600)
  }

  const handleGroupStep = async (answer: string) => {
    if (!groupFlow) return
    if (groupFlow.step === 1) {
      setGroupFlow(g => g ? { ...g, name: answer, step: 2 } : null)
      setTimeout(() => addAIMessage('Best email to reach you?'), 400)
    } else if (groupFlow.step === 2) {
      setGroupFlow(g => g ? { ...g, email: answer, step: 3 } : null)
      setTimeout(() => addAIMessage('How many rooms do you need?'), 400)
    } else if (groupFlow.step === 3) {
      setGroupFlow(g => g ? { ...g, rooms: answer, step: 4 } : null)
      setTimeout(() => addAIMessage('When do you need them?'), 400)
    } else if (groupFlow.step === 4) {
      const { name, email, rooms } = groupFlow
      setGroupFlow(null)
      await submitGroupInquiry(name, email, rooms, answer)
    }
  }

  const submitGroupInquiry = async (name: string, email: string, rooms: string, dates: string) => {
    setLoading(true)
    try {
      const parts = name.trim().split(' ')
      const firstName = parts[0]
      const lastName = parts.slice(1).join(' ') || '.'
      const numRoomsMatch = rooms.match(/\d+/)
      const numRooms = numRoomsMatch ? parseInt(numRoomsMatch[0]) : 1
      const res = await fetch(`${BASE}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email.trim(),
          phone: 'via AI chat',
          guest_type: 'group',
          num_rooms: numRooms,
          length_of_stay: dates,
          source: 'ai_chat',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const ref = data.id ? `INQ-${data.id.substring(0, 8).toUpperCase()}` : 'INQ-XXXXXXXX'
      addAIMessage(
        `Perfect! We will contact you within 2 hours with availability and group pricing.\n\nReference: ${ref}`
      )
    } catch {
      addAIMessage(
        "We've received your group request! Call or text +18883528151 for immediate assistance."
      )
    } finally {
      setLoading(false)
    }
  }

  const resolveHotelId = (hotelName: string): string => {
    const pattern = HOTEL_NAME_PATTERNS[hotelName]
    if (!pattern) return ''
    const found = hotels.find(h => h.name.toLowerCase().includes(pattern))
    return found?.id ?? ''
  }

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setQuickRepliesVisible(false)

    const userMsg: Message = { role: 'user', content: trimmed, ts: now() }
    setMessages(prev => [...prev, userMsg])

    // Route to active group flow
    if (groupFlow !== null) {
      await handleGroupStep(trimmed)
      return
    }

    // Detect new group inquiry
    if (isGroupInquiry(trimmed)) {
      triggerGroupFlow()
      return
    }

    setLoading(true)

    try {
      const r = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversation_history: buildHistory() }),
      })
      const data = await r.json()

      let bookingCard: BookingCard | undefined
      if (data.show_booking_card && data.hotel_name) {
        const hotelId = resolveHotelId(data.hotel_name)
        if (hotelId) {
          bookingCard = { hotelName: data.hotel_name, hotelId, price: data.price ?? 110 }
        }
      }

      const aiMsg: Message = {
        role: 'assistant',
        content: data.response,
        ts: now(),
        bookingCard,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting. Call or text us at +18883528151 and we'll help right away!",
        ts: now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-[20px] z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden w-[calc(100vw-40px)] max-w-[350px]"
          style={{ height: 520 }}
        >
          {/* Header */}
          <div className="bg-[#10192b] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full overflow-hidden">
                  <img src="/brand/monogram.svg" alt="" className="w-full h-full object-cover" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#10192b]" />
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
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-white text-slate-700 shadow-sm rounded-bl-sm'
                    }`}
                >
                  {m.content}
                </div>

                {/* Quick replies — only below the initial greeting */}
                {m.initial && quickRepliesVisible && (
                  <div className="flex flex-wrap gap-1.5 mt-1 max-w-[85%]">
                    {QUICK_REPLIES.map(qr => (
                      <button
                        key={qr.label}
                        onClick={() => send(qr.message)}
                        className="bg-white border border-orange-200 hover:border-orange-400 hover:bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                      >
                        {qr.label}
                      </button>
                    ))}
                    <a
                      href="tel:+18883528151"
                      className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> Call Us
                    </a>
                  </div>
                )}

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
              onClick={() => send(input)}
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
        className="fixed bottom-[20px] right-[20px] z-50 w-14 h-14 rounded-full shadow-xl hover:shadow-orange-200 transition-all flex items-center justify-center"
        aria-label="Open chat"
      >
        {open ? (
          <div className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center">
            <X className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
        ) : (
          <span className="relative w-14 h-14 rounded-full overflow-hidden flex items-center justify-center stayvoo-blob-breathe">
            <img src="/brand/monogram.svg" alt="Open chat" className="absolute inset-0 w-full h-full object-cover" />
            {hasUnread && (
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
          </span>
        )}
      </button>
    </>
  )
}
