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
      </Routes>
      <AIChat />
    </BrowserRouter>
  )
}
