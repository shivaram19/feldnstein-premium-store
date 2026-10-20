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

export default function App() {
  return (
    <>
      <Header />
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
      <Footer />
      <Toast />
    </>
  )
}
