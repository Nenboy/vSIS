import { supabase } from './supabase';

export type ActivityAction = 
  | 'CREATE_STUDENT'
  | 'UPDATE_STUDENT'
  | 'DELETE_STUDENT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'UPDATE_SETTINGS';

export async function logActivity(
  action: ActivityAction,
  entityType: string,
  entityId?: string,
  details?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('activity_logs').insert({
      user_email: user.email,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}