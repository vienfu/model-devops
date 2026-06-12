import React from "react";
import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import NotFound from "./pages/NotFound/NotFound";
import DashboardPage from "./pages/Dashboard/Dashboard";
import ModelsPage from "./pages/Models/Models";
import AnalysisPage from "./pages/Analysis/Analysis";
import AlertsPage from "./pages/Alerts/Alerts";

const RoutesComponent: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="alerts" element={<AlertsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
