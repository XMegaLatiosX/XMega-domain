import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/home'
import About from './pages/about'

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/about" element={<About/>} />
            <Route path="*" element={<h1>Not Found</h1>} />
        </Routes>
    </BrowserRouter>
//       <div className='page w-full h-screen overflow-y-auto justify-items-center flex flex-col'>
//           <Home></Home>
//       </div>
    )
}

export default App