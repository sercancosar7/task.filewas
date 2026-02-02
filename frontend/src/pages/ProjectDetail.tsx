import { useParams } from 'react-router-dom'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Proje Detayı</h1>
        <p className="mt-2 text-lg text-foreground/60">
          Proje ID: {id || 'Bilinmiyor'}
        </p>
        <p className="mt-1 text-sm text-foreground/40">
          Sonraki fazlarda tamamlanacak
        </p>
      </div>
    </div>
  )
}
