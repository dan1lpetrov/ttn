import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ClientsList from '../components/ClientsList';
import SenderSection from '../components/SenderSection';
import CreateTTNForm from '../components/CreateTTNForm';
import { TTNProvider } from '../contexts/TTNContext';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  // Перевіряємо наявність API ключа
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('nova_poshta_api_key')
      .eq('user_id', user.id)
      .single();

    if (!settings || !settings.nova_poshta_api_key) {
      redirect('/profile');
    }
  }

  return (
    <TTNProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Сервіс створення ТТН</h1>
            <Link
              href="/profile"
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Профіль
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6 pb-20">
          {/* Секція відправників */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <SenderSection />
          </div>

          {/* Секція клієнтів */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <ClientsList />
          </div>

          {/* Секція створення ТТН */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">ТТН</h2>
            </div>
            <CreateTTNForm />
          </div>
        </div>
      </main>
      </div>
    </TTNProvider>
  );
} 