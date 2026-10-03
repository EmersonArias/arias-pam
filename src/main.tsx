import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SystemDialogProvider } from './shared/components/dialogs/SystemDialogProvider'
import { AuthProvider } from './features/auth/context/AuthProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SystemDialogProvider>
          <App />
        </SystemDialogProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)