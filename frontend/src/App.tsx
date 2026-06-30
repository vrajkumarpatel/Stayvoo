import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import AIChat from './components/AIChat'
import Home from './pages/Home'
import ExclusiveHotels from './pages/ExclusiveHotels'
import HotelDetail from './pages/HotelDetail'
import SearchResults from './pages/SearchResults'
import BookingForm from './pages/BookingForm'
import Confirmation from './pages/Confirmation'
import Admin from './pages/Admin'
import GroupBooking from './pages/GroupBooking'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import About from './pages/About'
import MyReservations from './pages/MyReservations'
import GuestPortal from './pages/GuestPortal'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exclusive" element={<ExclusiveHotels />} />
        <Route path="/groups" element={<GroupBooking />} />
        <Route path="/hotels/:id" element={<HotelDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/book" element={<BookingForm />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/my-reservations" element={<MyReservations />} />
        <Route path="/my-stay/:token" element={<GuestPortal />} />
      </Routes>
      <AIChat />
    </BrowserRouter>
  )
}
