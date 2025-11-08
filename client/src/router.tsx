import { createBrowserRouter, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import AdminOverview from './pages/dashboard/AdminOverview.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import InventoryList from './pages/inventory/InventoryList';
import AddMedicine from './pages/inventory/AddMedicine.tsx';
import UploadExcel from './pages/inventory/UploadExcel.tsx';
import POS from './pages/sales/POS';
import SalesReport from './pages/reports/SalesReport';
import Employees from './pages/employees/Employees';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <Login /> },
  {
    path: '/dashboard',
    element: <ProtectedRoute roles={['admin', 'employee']}><Dashboard /></ProtectedRoute>,
    errorElement: <ErrorBoundary><div /></ErrorBoundary>,
    children: [
      // index route now renders AdminOverview for admins; employees will be redirected by Dashboard menu logic to another section
      { index: true, element: <ProtectedRoute roles={['admin']}><AdminOverview /></ProtectedRoute> },
      // explicit overview path for existing links / bookmarks
      { path: 'overview', element: <ProtectedRoute roles={['admin']}><AdminOverview /></ProtectedRoute> },
      { path: 'inventory', element: <ProtectedRoute roles={['admin', 'employee']}><InventoryList /></ProtectedRoute> },
      { path: 'inventory/add', element: <ProtectedRoute roles={['admin', 'employee']}><AddMedicine /></ProtectedRoute> },
      { path: 'inventory/upload', element: <ProtectedRoute roles={['admin', 'employee']}><UploadExcel /></ProtectedRoute> },
      { path: 'pos', element: <ProtectedRoute roles={['employee']}><POS /></ProtectedRoute> },
      { path: 'reports/sales', element: <ProtectedRoute roles={['admin', 'employee']}><SalesReport /></ProtectedRoute> },
      { path: 'employees', element: <ProtectedRoute roles={['admin']}><Employees /></ProtectedRoute> },
      { path: '*', element: <NotFound /> },
    ]
  }
  , { path: '*', element: <NotFound /> }
]);

export default router;
