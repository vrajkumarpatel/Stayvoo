import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, Numeric, Date, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    address = Column(String)
    phone = Column(String)
    email = Column(String)
    description = Column(Text)
    star_rating = Column(Integer)
    photo_urls = Column(JSON, default=list)
    amenities = Column(JSON, default=list)
    nearby_landmarks = Column(JSON, default=list)
    tier = Column(Integer, default=1)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rooms = relationship("Room", back_populates="hotel", lazy="select")
    bookings = relationship("Booking", back_populates="hotel")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotel_id = Column(UUID(as_uuid=True), ForeignKey("hotels.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    price_per_night = Column(Numeric(10, 2), nullable=False)
    max_guests = Column(Integer, nullable=False)
    photos = Column(JSON, default=list)
    amenities = Column(JSON, default=list)
    available_count = Column(Integer, default=10)

    hotel = relationship("Hotel", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")


class Guest(Base):
    __tablename__ = "guests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    guest_type = Column(String)
    company = Column(String, nullable=True)
    total_stays = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    access_token = Column(String, unique=True, nullable=True, index=True)
    token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="guest")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_ref = Column(String, unique=True, nullable=False)
    hotel_id = Column(UUID(as_uuid=True), ForeignKey("hotels.id"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False)
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id"), nullable=False)
    tier = Column(Integer, default=1)
    checkin_date = Column(Date, nullable=False)
    checkout_date = Column(Date, nullable=False)
    nights = Column(Integer, nullable=False)
    room_rate = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    commission_amount = Column(Numeric(10, 2), nullable=False)
    special_requests = Column(Text, nullable=True)
    estimated_arrival = Column(String, nullable=True)
    pms_confirmation = Column(String, nullable=True)
    status = Column(String, default="pending")
    guest_type = Column(String)
    source = Column(String, default="website")
    stripe_payment_method_id = Column(String, nullable=True)
    card_last4 = Column(String, nullable=True)
    card_brand = Column(String, nullable=True)
    last_modified_at = Column(DateTime, nullable=True)
    last_modified_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    hotel = relationship("Hotel", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    guest = relationship("Guest", back_populates="bookings")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inquiry_id = Column(UUID(as_uuid=True), ForeignKey("inquiries.id"), nullable=False)
    sender = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class StayMessage(Base):
    __tablename__ = "stay_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stay_id = Column(UUID(as_uuid=True), ForeignKey("stays.id"), nullable=True)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    inquiry_id = Column(UUID(as_uuid=True), ForeignKey("inquiries.id"), nullable=True)
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id"), nullable=True)
    sender = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Stay(Base):
    __tablename__ = "stays"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inquiry_id = Column(UUID(as_uuid=True), ForeignKey("inquiries.id"), nullable=True)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id"), nullable=True)
    guest_first_name = Column(String, nullable=False)
    guest_last_name = Column(String, nullable=False)
    guest_email = Column(String, nullable=False)
    guest_phone = Column(String, nullable=False)
    guest_type = Column(String, nullable=True)
    hotel_id = Column(UUID(as_uuid=True), ForeignKey("hotels.id"), nullable=True)
    hotel_name = Column(String, nullable=False)
    room_number = Column(String, nullable=True)
    num_rooms = Column(Integer, default=1)
    checkin_date = Column(Date, nullable=False)
    expected_checkout = Column(Date, nullable=False)
    actual_checkout = Column(Date, nullable=True)
    nights_total = Column(Integer, nullable=False)
    rate_per_night = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0)
    balance_due = Column(Numeric(10, 2), nullable=False)
    commission_rate = Column(Numeric(5, 2), default=10.00)
    commission_amount = Column(Numeric(10, 2), nullable=False)
    commission_paid = Column(Boolean, default=False)
    commission_paid_date = Column(Date, nullable=True)
    pms_confirmation = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    guest_type = Column(String, nullable=False)
    hotel_preference = Column(String, nullable=True)
    num_rooms = Column(Integer, nullable=False)
    length_of_stay = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    special_requirements = Column(Text, nullable=True)
    source = Column(String, default="website")
    status = Column(String, default="new")
    notes = Column(Text, nullable=True)
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id"), nullable=True)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservations.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotel_id = Column(UUID(as_uuid=True), ForeignKey("hotels.id"), nullable=False)
    month = Column(String, nullable=False)
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(Numeric(10, 2), default=0)
    commission_amount = Column(Numeric(10, 2), default=0)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


class CommissionRate(Base):
    __tablename__ = "commission_rates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotel_source = Column(String, unique=True, nullable=False)
    default_rate = Column(Numeric(5, 2), nullable=False, default=10.00)
    notes = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_ref = Column(String, unique=True, nullable=False)
    guest_id = Column(UUID(as_uuid=True), ForeignKey("guests.id"), nullable=True)

    hotel_source = Column(String, default="exclusive")
    hotel_source_id = Column(UUID(as_uuid=True), ForeignKey("hotels.id"), nullable=True)
    room_source_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=True)
    hotel_name_snapshot = Column(String, nullable=False)
    hotel_address_snapshot = Column(String, nullable=True)
    room_type_snapshot = Column(String, nullable=True)

    guest_first_name = Column(String, nullable=False)
    guest_last_name = Column(String, nullable=False)
    guest_email = Column(String, nullable=False)
    guest_phone = Column(String, nullable=True)
    guest_type = Column(String, nullable=True)

    checkin_date = Column(Date, nullable=False)
    checkout_date = Column(Date, nullable=False)
    nights = Column(Integer, nullable=False)
    rate_per_night = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0)
    balance_due = Column(Numeric(10, 2), nullable=False)

    commission_rate = Column(Numeric(5, 2), nullable=False)
    commission_amount = Column(Numeric(10, 2), nullable=False)
    commission_paid = Column(Boolean, default=False)
    commission_source_note = Column(String, nullable=True)

    special_requests = Column(Text, nullable=True)
    estimated_arrival = Column(String, nullable=True)
    pms_confirmation = Column(String, nullable=True)
    tier = Column(Integer, default=1)
    source = Column(String, default="website")

    stripe_payment_method_id = Column(String, nullable=True)
    card_last4 = Column(String, nullable=True)
    card_brand = Column(String, nullable=True)

    # pending → confirmed → checked_in → checked_out | cancelled
    status = Column(String, default="pending")

    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    checked_out_at = Column(DateTime, nullable=True)
    last_modified_at = Column(DateTime, nullable=True)
    last_modified_by = Column(String, nullable=True)

    guest = relationship("Guest", foreign_keys=[guest_id])
    messages = relationship("ReservationMessage", back_populates="reservation", cascade="all, delete-orphan")


class ReservationMessage(Base):
    __tablename__ = "reservation_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservations.id"), nullable=False)
    sender = Column(String, nullable=False)
    sender_name = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    reservation = relationship("Reservation", back_populates="messages")
