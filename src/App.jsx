import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/home'
import About from './pages/about'
import Notfound from './pages/404'
import GalleryHome from './pages/gallery'
import Gallery from './pages/gallery/galleries'
import Blog from './pages/blog'
import Blog_post from './pages/blog/post'
import Modal from './components/modal'
import Settings from './pages/settings'
import Feedback from './pages/feedback'
import CreatePost from './pages/blog/create-post'
import Self_improvement from './pages/self-improvement/self_improvement'
import Others_improvement from './pages/self-improvement/others-improvement'
import Projects from './pages/projects'
import AddProject from './pages/projects/add-project'

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/about" element={<About/>} />

            <Route path="/blog" element={<Blog/>} />
            <Route path="/blog/create-post" element={<CreatePost/>}>
                <Route path="/blog/create-post/:post_id"></Route>
            </Route>
            <Route path="/blog/:url_slug" element={<Blog_post/>} />

            <Route path="/gallery" element={<GalleryHome/>} />
            <Route path="/gallery/:category" element={<Gallery/>}>
                <Route path=":media_name" element={<Modal/>} />
            </Route>

            <Route path="/projects" element={<Projects/>} />
            <Route path="/projects/AddProject" element={<AddProject/>} >
                <Route path="/projects/AddProject/:project_id"></Route>
            </Route>

            <Route path="/self-improvement" element={<Self_improvement/>} />
            <Route path="/self-improvement/:nickname" element={<Others_improvement/>} />
            
            <Route path="/settings" element={<Settings/>} />
            <Route path="/feedback" element={<Feedback/>} />
            <Route path="*" element={<Notfound/>} />
        </Routes>
    </BrowserRouter>
    )
}

export default App