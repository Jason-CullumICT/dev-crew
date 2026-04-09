import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Canvas from './pages/Canvas'
import Oracle from './pages/Oracle'
import Reasoner from './pages/Reasoner'
import People from './pages/People'
import Groups from './pages/Groups'
import Grants from './pages/Grants'
import Schedules from './pages/Schedules'
import Doors from './pages/Doors'
import Sites from './pages/Sites'
import Zones from './pages/Zones'
import Policies from './pages/Policies'
import Controllers from './pages/Controllers'
import Intrusion from './pages/Intrusion'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/canvas" replace />} />
        <Route path="canvas"      element={<Canvas />} />
        <Route path="oracle"      element={<Oracle />} />
        <Route path="reasoner"    element={<Reasoner />} />
        <Route path="people"      element={<People />} />
        <Route path="groups"      element={<Groups />} />
        <Route path="grants"      element={<Grants />} />
        <Route path="schedules"   element={<Schedules />} />
        <Route path="doors"       element={<Doors />} />
        <Route path="sites"       element={<Sites />} />
        <Route path="zones"       element={<Zones />} />
        <Route path="policies"    element={<Policies />} />
        <Route path="controllers" element={<Controllers />} />
        <Route path="intrusion"   element={<Intrusion />} />
      </Route>
    </Routes>
  )
}
