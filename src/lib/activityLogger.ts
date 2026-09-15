import { supabase } from './supabase';

export type ActivityAction =
  | 'CREATE_STUDENT'
  | 'UPDATE_STUDENT'
  | 'DELETE_STUDENT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'UPDATE_SETTINGS'
  | 'QR_VERIFICATION'         // New
  | 'QR_VERIFICATION_FAILED'; // New

export async function logActivity(
  action: ActivityAction,
  entityType: string,
  entityId?: string,
  details?: any
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = details?.email || session?.user?.email || 'public-verifier';

    const { error } = await supabase.from('activity_logs').insert({
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || {},
    });

    if (error) {
      console.error('Log insert failed:', error.message);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}