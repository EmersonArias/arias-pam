import { Routes, Route } from 'react-router-dom'
import BooksPage from './pages/Books/BooksPage'
import LoginPage from './features/auth/pages/LoginPage'
import PamPage from './features/registers/pages/PamPage'
import AssetsPage from './features/registers/pages/AssetsPage'
import PumpsPage from './features/registers/pages/PumpsPage'
import PoolsPage from './features/pools/pages/PoolsPage'
import SpaPage from './features/spa/pages/SpaPage'
import LegionellaPage from './features/legionella/pages/LegionellaPage'
import ClimatizersPage from './features/climatizers/pages/ClimatizersPage'
import FancoilsPage from './features/fancoils/pages/FancoilsPage'
import ElectricalPanelsPage from './features/electricalpanels/pages/ElectricalPanelsPage'
import ElectricalPanelDetailPage from './features/electricalpanels/pages/ElectricalPanelDetailPage'
import ElectricalPanelsReportPage from './features/electricalpanels/pages/ElectricalPanelsReportPage'
import PhotoluminescentPage from './features/photoluminescent/pages/PhotoluminescentPage'
import EmergencyLightsPage from './features/emergencylights/pages/EmergencyLightsPage'
import FireDoorsPage from './features/firedoors/pages/FireDoorsPage'
import CalibrationsPage from './features/calibrations/pages/CalibrationsPage'
import FireEquipmentPage from './features/fireequipment/pages/FireEquipmentPage'
import ExtinguishersPage from './features/fireequipment/pages/ExtinguishersPage'
import BiePage from './features/fireequipment/pages/BiePage'
import SprinklersPage from './features/fireequipment/pages/SprinklersPage'
import PciReviewPage from './features/fireequipment/pages/PciReviewPage'
import ApparatusRegistryPage from './features/apparatusregistry/pages/ApparatusRegistryPage'
import ApparatusRegistryDetailPage from './features/apparatusregistry/pages/ApparatusRegistryDetailPage'
import ApparatusRegistryReportPage from './features/apparatusregistry/pages/ApparatusRegistryReportPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<BooksPage />} />

      <Route path="/pam" element={<PamPage />} />
      <Route path="/assets" element={<AssetsPage />} />
      <Route path="/pumps" element={<PumpsPage />} />
      <Route path="/pools" element={<PoolsPage />} />
      <Route path="/spa" element={<SpaPage />} />
      <Route path="/legionella" element={<LegionellaPage />} />
      <Route path="/climatizers" element={<ClimatizersPage />} />
      <Route path="/fancoils" element={<FancoilsPage />} />

      <Route path="/electricalpanels" element={<ElectricalPanelsPage />} />
      <Route path="/electricalpanels/new" element={<ElectricalPanelDetailPage />} />
      <Route path="/electricalpanels/report" element={<ElectricalPanelsReportPage />} />
      <Route path="/electricalpanels/:id" element={<ElectricalPanelDetailPage />} />

      <Route path="/apparatusregistry" element={<ApparatusRegistryPage />} />
      <Route path="/apparatusregistry/new" element={<ApparatusRegistryDetailPage />} />
      <Route path="/apparatusregistry/report" element={<ApparatusRegistryReportPage />} />
      <Route path="/apparatusregistry/:id" element={<ApparatusRegistryDetailPage />} />

      <Route path="/photoluminescent" element={<PhotoluminescentPage />} />
      <Route path="/emergencylights" element={<EmergencyLightsPage />} />
      <Route path="/firedoors" element={<FireDoorsPage />} />
      <Route path="/calibrations" element={<CalibrationsPage />} />

      <Route path="/fireequipment" element={<FireEquipmentPage />} />
      <Route path="/fireequipment/extinguishers" element={<ExtinguishersPage />} />
      <Route path="/fireequipment/bie" element={<BiePage />} />
      <Route path="/fireequipment/sprinklers" element={<SprinklersPage />} />
      <Route path="/fireequipment/pci-review" element={<PciReviewPage />} />
    </Routes>
  )
}
