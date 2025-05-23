import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../supabase';

interface EventFormData {
  title: string;
  description: string;
  selected_date: string;
  selected_time: string;
  expected_capacity_min: number;
  expected_capacity_max: number;
  assets_needed: string[];
  event_type: string;
  event_status?: "private_pending" | "public_pending" | "public_approved" | "private_approved";
  duration: number;
}

export async function createEvent(formData: EventFormData) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log('Creating event');
  // Create the event
  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: session.user.id,
      title: formData.title,
      description: formData.description,
      selected_date: formData.selected_date,
      selected_time: formData.selected_time,
      expected_capacity_min: formData.expected_capacity_min,
      expected_capacity_max: formData.expected_capacity_max,
      assets_needed: formData.assets_needed || [],
      event_type: formData.event_type,
      is_active: true,
      event_status: formData.event_status || 'private_pending',
      duration: formData.duration,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }

  return data;
}

export const useCreateEvent = () => {
  return useMutation({
    mutationFn: createEvent,
  });
}; 