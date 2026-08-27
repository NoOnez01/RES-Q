import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// The packaged Electron app loads index.html over file:// (no real HTTP
// origin), where the History API's path-based navigation that BrowserRouter
// depends on doesn't work -- routes never resolve. HashRouter's URL-hash
// based routing has no such dependency, so it's used instead for that one
// target; the web deploy and Capacitor's native WebView (a real http-like
// origin) both keep BrowserRouter as before.
const isFileProtocol = window.location.protocol === 'file:'
const Router = isFileProtocol ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router {...(isFileProtocol ? {} : { basename: import.meta.env.BASE_URL })}>
      <App />
    </Router>
  </StrictMode>,
)
