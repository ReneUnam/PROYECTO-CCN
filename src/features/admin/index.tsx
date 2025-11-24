import AdminAlertsPanel from './AdminAlertsPanel';

export default function AdminPanel() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-8">Panel de Administración</h1>
      <AdminAlertsPanel />
    </div>
  );
}
