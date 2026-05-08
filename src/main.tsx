import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                {/* Landing page to create a room */}
                <Route path="/" element={<App />} />
                {/* The actual planning poker room */}
                <Route path="/room/:roomId" element={<App />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
)