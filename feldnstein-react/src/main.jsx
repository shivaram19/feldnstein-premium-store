import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext.tsx'
import { CustomerProvider } from './context/CustomerContext.tsx'
import { ContentProvider } from './context/ContentContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ContentProvider>
      <CartProvider>
        <CustomerProvider>
          <App />
        </CustomerProvider>
      </CartProvider>
    </ContentProvider>
  </StrictMode>,
)
