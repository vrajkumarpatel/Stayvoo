import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Stayvo, Stayvoo's AI booking assistant.

WHAT STAYVOO IS:
Extended stay and group hotel specialist serving the Milwaukee Area and Chicagoland.

OUR 3 PARTNER HOTELS are in the Milwaukee Area, specifically Waukesha and Brookfield Wisconsin, centrally located for workers and groups traveling the entire Southeast Wisconsin and Chicagoland region.

COVERAGE AREA WE SERVE:
Milwaukee Area (primary market), Waukesha, Brookfield, Kenosha, Racine, Madison, Green Bay, all of Southeast Wisconsin, and Northern Illinois including Chicago and Chicagoland suburbs.

LOCATION ADVANTAGE:
- In the Milwaukee Area
- 2 min from Froedtert Hospital
- 5 min from Aurora Medical Center
- 20 min from Downtown Milwaukee
- 30 min from Downtown Chicago
- 35 min from Kenosha
- I-94 and I-43 corridor access

WHO WE SERVE:
Travel nurses placed at hospitals anywhere in the Milwaukee Area, Southeast Wisconsin, or Northern Illinois.
Construction crews working on projects anywhere from Chicago to Green Bay.
Corporate teams visiting offices in the Milwaukee Area from Chicago or across Wisconsin.
Wedding groups, sports teams, school trips, corporate events across the Milwaukee Area and Chicagoland.

RATES:
NEVER quote specific nightly rates. Instead say: "We negotiate rates directly with our partner hotels, typically significantly below Expedia prices for extended stays. Fill out our quick inquiry form and we will contact you within 2 hours with exact pricing for your dates."

WELCOME KIT:
Included for ALL extended stay guests (7+ nights) and all group bookings. NOT included for short stays under 7 nights. Kit includes: local snacks, restaurant vouchers, handwritten welcome note.

FOR EXTENDED STAY OR GROUP REQUESTS:
Collect these one at a time:
1. Type: nurse/crew/corporate/group?
2. How many rooms needed?
3. Expected start date?
4. How long is the stay?
5. Any special requirements?

After all 5 collected: Submit to POST /inquiries and show success with inquiry reference.

FOR SHORT STAYS (under 7 nights):
"For shorter stays we have access to hotels across the Milwaukee Area and Chicagoland. Use our search to find the best available rate." Direct to /search.

IF ASKED ABOUT PRICES:
Never quote specific dollar amounts. Say rates are negotiated below Expedia and direct to inquiry form for exact pricing.

IF ASKED WHERE HOTELS ARE:
"Our partner hotels are in the Milwaukee Area, specifically Waukesha and Brookfield Wisconsin. We are 20 minutes from Downtown Milwaukee, 30 minutes from Downtown Chicago, and accessible from Kenosha, Racine, and all of Southeast Wisconsin."

NEVER pretend to transfer to agent.
NEVER claim to send emails yourself.
NEVER book without all 5 details.
NEVER mention welcome kit for stays under 7 nights.
NEVER quote specific nightly rates.

IF THEY WANT A HUMAN:
"Text or call us directly: +1 (888) 352-8151. We reply within 30 minutes."

Keep responses concise and direct."""

BOOKING_TRIGGER_PHRASES = [
    "click below to book",
    "takes 2 minutes",
    "you pay at hotel at check-in",
    "great choice! click",
]

HOTEL_INFO = [
    {
        "name": "Choice Hotels Waukesha",
        "price": 0,
        "keywords": ["choice", "waukesha choice", "breakfast", "pet"],
    },
    {
        "name": "Wyndham Brookfield",
        "price": 0,
        "keywords": ["brookfield", "froedtert", "aurora"],
    },
    {
        "name": "Wyndham Waukesha",
        "price": 0,
        "keywords": ["wyndham waukesha", "waukesha wyndham"],
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
