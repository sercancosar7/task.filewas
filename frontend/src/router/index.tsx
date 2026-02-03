import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { Toaster } from 'sonner'
import { ROUTES } from './routes'
import { Spinner } from '@/components/ui/spinner'

// Lazy loaded pages
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Projects = lazy(() => import('@/pages/Projects'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Sessions = lazy(() => import('@/pages/Sessions'))
const SessionDetail = lazy(() => import('@/pages/SessionDetail'))
const Agents = lazy(() => import('@/pages/Agents'))
const Skills = lazy(() => import('@/pages/Skills'))
const Sources = lazy(() => import('@/pages/Sources'))
const Logs = lazy(() => import('@/pages/Logs'))
const Settings = lazy(() => import('@/pages/Settings'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner size="lg" />
    </div>
  )
}

// Suspense wrapper for lazy components
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// Root layout - placeholder for future layout wrapper
function RootLayout() {
  return (
    <SuspenseWrapper>
      <Outlet />
    </SuspenseWrapper>
  )
}

// Router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Home redirects to dashboard
      {
        index: true,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      // Dashboard
      {
        path: ROUTES.DASHBOARD,
        element: <Dashboard />,
      },
      // Projects
      {
        path: ROUTES.PROJECTS,
        element: <Projects />,
      },
      {
        path: ROUTES.PROJECT_DETAIL,
        element: <ProjectDetail />,
      },
      {
        path: ROUTES.PROJECT_SESSIONS,
        element: <ProjectDetail />,
      },
      {
        path: ROUTES.PROJECT_ROADMAP,
        element: <ProjectDetail />,
      },
      {
        path: ROUTES.PROJECT_FILES,
        element: <ProjectDetail />,
      },
      {
        path: ROUTES.PROJECT_CHANGELOG,
        element: <ProjectDetail />,
      },
      {
        path: ROUTES.PROJECT_SETTINGS,
        element: <ProjectDetail />,
      },
      // Sessions
      {
        path: ROUTES.SESSIONS,
        element: <Sessions />,
      },
      {
        path: ROUTES.SESSION_DETAIL,
        element: <SessionDetail />,
      },
      // ECC
      {
        path: ROUTES.AGENTS,
        element: <Agents />,
      },
      {
        path: ROUTES.SKILLS,
        element: <Skills />,
      },
      {
        path: ROUTES.SOURCES,
        element: <Sources />,
      },
      // System
      {
        path: ROUTES.LOGS,
        element: <Logs />,
      },
      {
        path: ROUTES.SETTINGS,
        element: <Settings />,
      },
      // Auth
      {
        path: ROUTES.LOGIN,
        element: <Login />,
      },
      // 404
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

// Router Provider wrapper component
export function AppRouter() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        duration={5000}
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-[8px] shadow-modal-small border-foreground/10 bg-background',
            title: 'text-sm font-semibold text-foreground',
            description: 'text-sm text-foreground/90',
            actionButton: 'rounded-[6px] bg-accent text-white hover:bg-accent/90',
            cancelButton: 'rounded-[6px] bg-foreground/5 text-foreground hover:bg-foreground/10',
            closeButton: 'bg-transparent border-foreground/10 text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-md p-1',
            success: 'border-l-4 border-l-success',
            error: 'border-l-4 border-l-destructive',
            info: 'border-l-4 border-l-accent',
            warning: 'border-l-4 border-l-info',
          },
        }}
      />
    </>
  )
}

export { ROUTES } from './routes'
export * from './routes'
