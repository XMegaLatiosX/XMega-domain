import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/home'
import About from './pages/about'
import Notfound from './pages/404'
import GalleryPage from './pages/gallery'

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/about" element={<About/>} />
            <Route path="/gallery" element={<GalleryPage/>} />
            <Route path="*" element={<Notfound/>} />
        </Routes>
    </BrowserRouter>
    )
}

export default App