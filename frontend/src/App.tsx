import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import AIChat from './components/AIChat'
import Home from './pages/Home'
import ExclusiveHotels from './pages/ExclusiveHotels'
import HotelDetail from './pages/HotelDetail'
import SearchResults from './pages/SearchResults'
import Confirmation from './pages/Confirmation'
import Admin from './pages/Admin'
import GroupBooking from './pages/GroupBooking'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import About from './pages/About'
import MyReservations from './pages/MyReservations'
import GuestPortal from './pages/GuestPortal'
import Contact from './pages/Contact'
import Brand from './pages/Brand'

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
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/my-reservations" element={<MyReservations />} />
        <Route path="/my-stay/:token" element={<GuestPortal />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/brand" element={<Brand />} />
        <Route path="*" element={<Navigate to="/contact" replace />} />
      </Routes>
      <AIChat />
    </BrowserRouter>
  )
}
