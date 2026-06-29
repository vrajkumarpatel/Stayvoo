import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import ExclusiveHotels from './pages/ExclusiveHotels'
import HotelDetail from './pages/HotelDetail'
import SearchResults from './pages/SearchResults'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exclusive" element={<ExclusiveHotels />} />
        <Route path="/hotels/:id" element={<HotelDetail />} />
        <Route path="/search" element={<SearchResults />} />
      </Routes>
    </BrowserRouter>
  )
}
