import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/Users';
import { DoorsPage } from './pages/Doors';
import { ControllersPage } from './pages/Controllers';
import { PoliciesPage } from './pages/Policies';
import { AccessTestPage } from './pages/AccessTest';
import { AccessMatrixPage } from './pages/AccessMatrix';
import { useStore } from './store/useStore';
import { useEffect } from 'react';
import { generateTestData } from './data/generateTestData';

function App() {
  const { users, setUsers, setDoors, setControllers, setPolicies } = useStore();

  useEffect(() => {
    // Populate with test data if empty
    if (users.length === 0) {
      const data = generateTestData();
      setUsers(data.users);
      setDoors(data.doors);
      setControllers(data.controllers);
      setPolicies(data.policies);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="doors" element={<DoorsPage />} />
          <Route path="controllers" element={<ControllersPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="test" element={<AccessTestPage />} />
          <Route path="matrix" element={<AccessMatrixPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
