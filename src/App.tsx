import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import SettingsLayout from './components/SettingsLayout';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import InStockPage from './pages/transactions/InStockPage';
import InDeadstockPage from './pages/transactions/InDeadstockPage';
import OutDeadstockPage from './pages/transactions/OutDeadstockPage';
import PreviewDeadstockPage from './pages/PreviewDeadstockPage';
import OutStockPage from './pages/transactions/OutStockPage';
import VendorStockPage from './pages/transactions/VendorStockPage';
import ProductsPage from './pages/settings/ProductsPage';
import { 
  CategoriesPage, 
  UnitsPage, 
  PicsPage, 
  VendorsPage, 
  InStockReasonsPage, 
  OutStockReasonsPage
} from './pages/settings/BasicSettings';
import FinanceRecapPage from './pages/FinanceRecapPage';
import JadwalOpnamePage from './pages/stock-opname/JadwalOpnamePage';
import ProgresOpnamePage from './pages/stock-opname/ProgresOpnamePage';

function SessionRedirector({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isNewSession = !sessionStorage.getItem('active_session');
    if (isNewSession) {
      sessionStorage.setItem('active_session', 'true');
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, []);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionRedirector>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory/stock" element={<InventoryPage type="stock" />} />
          <Route path="inventory/warehouse" element={<InventoryPage type="warehouse" />} />
          <Route path="inventory/cloudpop" element={<InventoryPage type="cloudpop" />} />
          <Route path="inventory/marketing" element={<InventoryPage type="marketing" />} />
          <Route path="deadstock/in" element={<InDeadstockPage />} />
          <Route path="deadstock/out" element={<OutDeadstockPage />} />
          <Route path="deadstock/inventory" element={<InventoryPage type="deadstock" />} />
          <Route path="deadstock/preview" element={<PreviewDeadstockPage />} />
          <Route path="in-stock" element={<InStockPage />} />
          <Route path="out-stock" element={<OutStockPage />} />
          <Route path="vendor-stock" element={<VendorStockPage />} />
          <Route path="opname/jadwal" element={<JadwalOpnamePage />} />
          <Route path="opname/progres" element={<ProgresOpnamePage />} />
          <Route path="finance-recap" element={<FinanceRecapPage />} />
          
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="products" replace />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="units" element={<UnitsPage />} />
            <Route path="pics" element={<PicsPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="in-reasons" element={<InStockReasonsPage />} />
            <Route path="out-reasons" element={<OutStockReasonsPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </SessionRedirector>
    </BrowserRouter>
  );
}
