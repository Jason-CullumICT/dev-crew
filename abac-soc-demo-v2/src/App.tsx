import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { useStore } from './store/store';
import { generateRealWorldData } from './data/realWorldData';

import Dashboard from './pages/Dashboard';
import Sites from './pages/Sites';
import Arming from './pages/Arming';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Permissions from './pages/Permissions';
import Doors from './pages/Doors';
import Controllers from './pages/Controllers';
import Policies from './pages/Policies';
import Tasks from './pages/Tasks';
import TestAccess from './pages/TestAccess';
import AccessMatrix from './pages/AccessMatrix';
import Schedules from './pages/Schedules';

export default function App() {
  const users = useStore((s) => s.users);

  useEffect(() => {
    if (users.length === 0) {
      generateRealWorldData();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="sites" element={<Sites />} />
          <Route path="arming" element={<Arming />} />
          <Route path="users" element={<Users />} />
          <Route path="groups" element={<Groups />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="doors" element={<Doors />} />
          <Route path="controllers" element={<Controllers />} />
          <Route path="policies" element={<Policies />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="test" element={<TestAccess />} />
          <Route path="matrix" element={<AccessMatrix />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
