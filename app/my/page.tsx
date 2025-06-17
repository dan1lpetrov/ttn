import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import AddClientForm from '../components/AddClientForm';

export default async function MyPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  return (
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
  );
} 