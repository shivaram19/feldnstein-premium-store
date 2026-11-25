import { useEffect } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Ticker from './components/Ticker'
import ProcessSection from './components/ProcessSection'
import CreedSection from './components/CreedSection'
import MatrixSection from './components/MatrixSection'
import CollectionSection from './components/CollectionSection'
import SubscriptionSection from './components/SubscriptionSection'
import TestimonialsSection from './components/TestimonialsSection'
import Footer from './components/footer/Footer'
import WhatsAppFloat from './components/WhatsAppFloat'
import BackToTop from './components/BackToTop'
import { unlockSound } from './hooks/useSoundFeedback'
import Toast from './components/Toast'
import CartDrawer from './components/CartDrawer'
import CheckoutView from './components/CheckoutView'
import CartView from './components/CartView'
import AccountView from './components/AccountView'
import TrackOrder from './components/TrackOrder'
import ProductDetailView from './components/ProductDetailView'
import PolicyView from './components/PolicyView'
import { useCart } from './context/CartContext'

export default function App() {
  const { view, productId, policyKey } = useCart()
  // View switches must start at the top of the new view — the browser otherwise
  // keeps the previous view's scroll offset (cart/checkout/track all expect top).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view, productId, policyKey])

  // Sound unlocks only on the visitor's first gesture (browser policy + autonomy).
  useEffect(() => {
    const unlock = () => {
      unlockSound()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])
  return (
    <>
      <Header />
      {view === 'home' ? (
        <main>
          <Hero />
          <CollectionSection />
          <Ticker />
          <ProcessSection />
          <CreedSection />
          <MatrixSection />
          <SubscriptionSection />
          <TestimonialsSection />
        </main>
      ) : view === 'product' ? (
        <main>
          <ProductDetailView key={productId} productId={productId} />
        </main>
      ) : view === 'policy' ? (
        <main>
          <PolicyView key={policyKey} policyKey={policyKey} />
        </main>
      ) : view === 'cart' ? (
        <main>
          <CartView />
        </main>
      ) : view === 'account' ? (
        <main>
          <AccountView />
        </main>
      ) : view === 'checkout' ? (
        <main>
          <CheckoutView />
        </main>
      ) : (
        <main>
          <TrackOrder />
        </main>
      )}
      <Footer />
      <Toast />
      <CartDrawer />
      <WhatsAppFloat />
      <BackToTop />
    </>
  )
}
