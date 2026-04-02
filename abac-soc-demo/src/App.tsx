import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { SitesPage } from './pages/Sites';
import { ArmingPage } from './pages/Arming';
import { UsersPage } from './pages/Users';
import { GroupsPage } from './pages/Groups';
import { PermissionsPage } from './pages/Permissions';
import { DoorsPage } from './pages/Doors';
import { ControllersPage } from './pages/Controllers';
import { PoliciesPage } from './pages/Policies';
import { TaskBoardPage } from './pages/Tasks';
import { AccessTestPage } from './pages/AccessTest';
import { AccessMatrixPage } from './pages/AccessMatrix';
import { useStore } from './store/useStore';
import { useEffect } from 'react';
import { generateTestData } from './data/generateTestData';

function App() {
  const { 
    users, 
    setUsers, setGroups, setGrants, setSites, setZones, 
    setDoors, setControllers, setPolicies, setTasks 
  } = useStore();

  useEffect(() => {
    if (users.length === 0) {
      const data = generateTestData();
      setUsers(data.users);
      setGroups(data.groups);
      setGrants(data.grants);
      setSites(data.sites);
      setZones(data.zones);
      setDoors(data.doors);
      setControllers(data.controllers);
      setPolicies(data.policies);
      setTasks(data.tasks);
    }
  }, [users.length, setUsers, setGroups, setGrants, setSites, setZones, setDoors, setControllers, setPolicies, setTasks]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="arming" element={<ArmingPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="doors" element={<DoorsPage />} />
          <Route path="controllers" element={<ControllersPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="tasks" element={<TaskBoardPage />} />
          <Route path="test" element={<AccessTestPage />} />
          <Route path="matrix" element={<AccessMatrixPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
