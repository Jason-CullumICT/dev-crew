import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

const Dashboard   = lazy(() => import('./pages/Dashboard'))
const Canvas      = lazy(() => import('./pages/Canvas'))
const Oracle      = lazy(() => import('./pages/Oracle'))
const Reasoner    = lazy(() => import('./pages/Reasoner'))
const People      = lazy(() => import('./pages/People'))
const Groups      = lazy(() => import('./pages/Groups'))
const Grants      = lazy(() => import('./pages/Grants'))
const Schedules   = lazy(() => import('./pages/Schedules'))
const Doors       = lazy(() => import('./pages/Doors'))
const Sites       = lazy(() => import('./pages/Sites'))
const Zones       = lazy(() => import('./pages/Zones'))
const Policies    = lazy(() => import('./pages/Policies'))
const Controllers = lazy(() => import('./pages/Controllers'))
const Intrusion   = lazy(() => import('./pages/Intrusion'))
const Monitor     = lazy(() => import('./pages/Monitor'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0b0e18]">
      <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
        <Route path="canvas"      element={<Suspense fallback={<PageLoader />}><Canvas /></Suspense>} />
        <Route path="oracle"      element={<Suspense fallback={<PageLoader />}><Oracle /></Suspense>} />
        <Route path="reasoner"    element={<Suspense fallback={<PageLoader />}><Reasoner /></Suspense>} />
        <Route path="people"      element={<Suspense fallback={<PageLoader />}><People /></Suspense>} />
        <Route path="groups"      element={<Suspense fallback={<PageLoader />}><Groups /></Suspense>} />
        <Route path="grants"      element={<Suspense fallback={<PageLoader />}><Grants /></Suspense>} />
        <Route path="schedules"   element={<Suspense fallback={<PageLoader />}><Schedules /></Suspense>} />
        <Route path="doors"       element={<Suspense fallback={<PageLoader />}><Doors /></Suspense>} />
        <Route path="sites"       element={<Suspense fallback={<PageLoader />}><Sites /></Suspense>} />
        <Route path="zones"       element={<Suspense fallback={<PageLoader />}><Zones /></Suspense>} />
        <Route path="policies"    element={<Suspense fallback={<PageLoader />}><Policies /></Suspense>} />
        <Route path="controllers" element={<Suspense fallback={<PageLoader />}><Controllers /></Suspense>} />
        <Route path="intrusion"   element={<Suspense fallback={<PageLoader />}><Intrusion /></Suspense>} />
        <Route path="monitor"     element={<Suspense fallback={<PageLoader />}><Monitor /></Suspense>} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
