import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext.tsx'
import { CustomerProvider } from './context/CustomerContext.tsx'
import { ContentProvider } from './context/ContentContext.jsx'
import { LanguageProvider } from './context/LanguageContext.tsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <ContentProvider>
        <CartProvider>
          <CustomerProvider>
            <App />
          </CustomerProvider>
        </CartProvider>
      </ContentProvider>
    </LanguageProvider>
  </StrictMode>,
)
