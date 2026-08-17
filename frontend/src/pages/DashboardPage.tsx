import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Bem-vindo, {user?.full_name || user?.email}
          </h1>
          <button
            onClick={logout}
            className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
          >
            Sair
          </button>
        </div>
        <p className="mt-4 text-gray-600">
          Área de controle de apostas em construção.
        </p>
      </div>
    </div>
  );
}
