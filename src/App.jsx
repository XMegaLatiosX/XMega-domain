import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/home'
import About from './pages/about'
import Notfound from './pages/404'
import GalleryHome from './pages/gallery'
import Gallery from './pages/gallery/galleries'
import Blog from './pages/blog'
import Blog_post from './pages/blog/post'
import Modal from './components/modal'

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/about" element={<About/>} />
            <Route path="/blog" element={<Blog/>} />
            <Route path="/blog/:post_name" element={<Blog_post/>} />
            <Route path="/gallery" element={<GalleryHome/>} />
            <Route path="/gallery/:category" element={<Gallery/>}>
                <Route path=":media_name" element={<Modal/>} />
            </Route>
            <Route path="*" element={<Notfound/>} />
        </Routes>
    </BrowserRouter>
    )
}

export default App