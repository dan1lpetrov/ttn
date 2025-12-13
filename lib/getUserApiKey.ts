import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Отримує API ключ Нової Пошти для поточного користувача
 * @returns API ключ або null, якщо не знайдено
 */
export async function getUserApiKey(): Promise<string | null> {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return null;
        }

        const { data, error } = await supabase
            .from('user_settings')
            .select('nova_poshta_api_key')
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            return null;
        }

        return data.nova_poshta_api_key || null;
    } catch (error) {
        console.error('Error getting user API key:', error);
        return null;
    }
}

