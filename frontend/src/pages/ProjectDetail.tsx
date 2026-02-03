import { useParams } from 'react-router-dom'
import { ProjectTabs } from '@/components/project'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="flex min-h-screen bg-background">
      <ProjectTabs projectId={id} />
    </div>
  )
}
