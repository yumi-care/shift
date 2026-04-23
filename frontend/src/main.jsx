import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// Set default headers for Supabase API
axios.defaults.headers.common['apikey'] = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
