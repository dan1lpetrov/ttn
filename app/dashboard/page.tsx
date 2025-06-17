import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import AddClientForm from '../components/AddClientForm';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-gray-900">TTN One</span>
              </div>
            </div>
            <div className="flex items-center">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="ml-4 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Вийти
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Додати нового клієнта
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Заповніть форму для додавання нового клієнта</p>
              </div>
              <div className="mt-5">
                <AddClientForm />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 