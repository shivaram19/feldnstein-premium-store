import { useCart } from '../context/CartContext'

export default function Toast() {
  const { toast } = useCart()
  return (
    <div id="toast" role="status" aria-live="polite" className={toast.visible ? 'show' : ''}>
      {toast.message}
    </div>
  )
}
