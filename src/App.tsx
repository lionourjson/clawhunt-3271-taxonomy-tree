import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import TaxonomyPage from './pages/TaxonomyPage';

/** 路由：标签管理页在 /admin/taxonomy，其他路径都跳转过去（保留查询参数）。 */
function RedirectToTaxonomy() {
  const { search } = useLocation();
  return <Navigate to={`/admin/taxonomy${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/taxonomy" element={<TaxonomyPage />} />
      <Route path="*" element={<RedirectToTaxonomy />} />
    </Routes>
  );
}
