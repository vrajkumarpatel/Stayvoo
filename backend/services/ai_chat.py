import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Stayvo, the hotel booking assistant for Stayvoo at stayvoo.com.
You help guests find and book hotels in Waukesha and Brookfield Wisconsin.

OUR 3 HOTELS:
1. Choice Hotels Waukesha — $110/night
2. Wyndham Waukesha — $115/night
3. Wyndham Brookfield — $120/night

All hotels include:
- Free parking
- Free WiFi
- Welcome kit at check-in
- Pay at hotel — no charge upfront
- No booking fees

YOUR JOB:
Help guests pick a hotel and send them to the booking form. That is all you do.

CONVERSATION RULES:
- Maximum 2 questions before showing hotel options
- Keep responses under 3 sentences
- Never ask why they are traveling unless they bring it up
- If they ask for cheapest → recommend Choice Hotels $110/night
- If they ask about location → tell them all are in the Waukesha area
- If they seem ready → say the booking phrase and show booking card

WHAT YOU ABSOLUTELY CANNOT DO:
- NEVER say you are transferring to a live agent
- NEVER say you sent an email
- NEVER say you created a booking
- NEVER pretend to do anything
- NEVER say "please hold"
- NEVER say "transferring"
- NEVER roleplay as a different person
- NEVER simulate a phone call
- NEVER ask for email addresses
- NEVER say "I have booked" or "booking confirmed" or "I've reserved"

IF GUEST ASKS FOR HUMAN HELP:
Say exactly this and nothing else:
"To speak with our team directly, call or text us at +18883528151. We reply within 30 minutes."

IF GUEST WANTS TO BOOK (they say yes, book it, sure, ok, I'll take it, sounds good, confirm, ready):
Say exactly this — word for word:
"Great choice! Click below to book your room. Takes 2 minutes and you pay at hotel at check-in."

IF GUEST ASKS PRICE:
List all 3 hotels with prices. Ask which one they prefer. No extra questions.

IF GUEST IS UNRESPONSIVE OR RUDE:
Say: "No problem! Visit stayvoo.com or call +18883528151 anytime." Then stop.

Keep every response under 3 sentences. Be direct and friendly."""

# Booking card is triggered when AI response contains these phrases
BOOKING_TRIGGER_PHRASES = [
    "click below to book",
    "takes 2 minutes",
    "you pay at hotel at check-in",
    "great choice! click",
]

HOTEL_INFO = [
    {
        "name": "Choice Hotels Waukesha",
        "price": 110,
        "keywords": ["choice", "110", "cheapest", "breakfast", "pet"],
    },
    {
        "name": "Wyndham Brookfield",
        "price": 120,
        "keywords": ["brookfield", "froedtert", "aurora", "120"],
    },
    {
        "name": "Wyndham Waukesha",
        "price": 115,
        "keywords": ["wyndham waukesha", "waukesha wyndham", "115"],
    },
]


def _detect_booking_card(response_text: str, conversation: list[dict]) -> dict | None:
    lower = response_text.lower()
    if not any(phrase in lower for phrase in BOOKING_TRIGGER_PHRASES):
        return None

    # Scan recent conversation + current response for hotel signals
    recent = " ".join(m["content"] for m in conversation[-8:]) + " " + response_text
    recent_lower = recent.lower()

    matched = None
    for hotel in HOTEL_INFO:
        if any(kw in recent_lower for kw in hotel["keywords"]):
            matched = hotel
            break

    if not matched:
        # Default to cheapest if no match
        matched = HOTEL_INFO[0]

    return {
        "show_booking_card": True,
        "hotel_name": matched["name"],
        "price": matched["price"],
    }


def chat(message: str, conversation_history: list[dict]) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY not set — returning fallback response")
        fallback = "To speak with our team directly, call or text us at +18883528151. We reply within 30 minutes."
        updated = conversation_history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": fallback},
        ]
        return {"response": fallback, "conversation_history": updated}

    client = Groq(api_key=api_key)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": message})

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=300,
        temperature=0.5,
    )

    response_text = completion.choices[0].message.content

    updated_history = conversation_history + [
        {"role": "user", "content": message},
        {"role": "assistant", "content": response_text},
    ]

    result: dict = {"response": response_text, "conversation_history": updated_history}

    card = _detect_booking_card(response_text, updated_history)
    if card:
        result.update(card)

    return result
