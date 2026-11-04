import Header from './components/Header'
import Hero from './components/Hero'
import Ticker from './components/Ticker'
import ProcessSection from './components/ProcessSection'
import CreedSection from './components/CreedSection'
import MatrixSection from './components/MatrixSection'
import CollectionSection from './components/CollectionSection'
import SubscriptionSection from './components/SubscriptionSection'
import TestimonialsSection from './components/TestimonialsSection'
import Footer from './components/Footer'
import Toast from './components/Toast'
import CartDrawer from './components/CartDrawer'
import CheckoutView from './components/CheckoutView'
import TrackOrder from './components/TrackOrder'
import { useCart } from './context/CartContext'

export default function App() {
  const { view } = useCart()
  return (
    <>
      <Header />
      {view === 'home' ? (
        <main>
          <Hero />
          <Ticker />
          <ProcessSection />
          <CreedSection />
          <MatrixSection />
          <CollectionSection />
          <SubscriptionSection />
          <TestimonialsSection />
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
    </>
  )
}
