import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../supabase';

interface EventFormData {
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  expected_capacity_min: number;
  expected_capacity_max: number;
  assets_needed: string[];
  event_type: string;
}

export async function createEvent(formData: EventFormData) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: session.user.id,
      title: formData.title,
      description: formData.description,
      start_date: formData.start_date,
      end_date: formData.end_date,
      expected_capacity_min: formData.expected_capacity_min,
      expected_capacity_max: formData.expected_capacity_max,
      assets_needed: formData.assets_needed || [],
      event_type: formData.event_type,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export const useCreateEvent = () => {
  return useMutation({
    mutationFn: createEvent,
  });
}; 