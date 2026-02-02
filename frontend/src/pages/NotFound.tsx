import { Link } from 'react-router-dom'
import { ROUTES } from '@/router/routes'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tight text-foreground/20">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Sayfa Bulunamadı</h2>
        <p className="mt-2 text-lg text-foreground/60">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link
          to={ROUTES.DASHBOARD}
          className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}
