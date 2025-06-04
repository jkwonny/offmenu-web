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
  address: string;
  street_number: string;
  street_name: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  website?: string;
  instagram_handle?: string;
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
      address: formData.address,
      street_number: formData.street_number,
      street_name: formData.street_name,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      website: formData.website,
      instagram_handle: formData.instagram_handle,
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

interface UpdateEventFormData extends EventFormData {
  id: string;
}

export async function updateEvent(formData: UpdateEventFormData) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log('Updating event');
  // Update the event
  const { data, error } = await supabase
    .from('events')
    .update({
      title: formData.title,
      description: formData.description,
      selected_date: formData.selected_date,
      selected_time: formData.selected_time,
      expected_capacity_min: formData.expected_capacity_min,
      expected_capacity_max: formData.expected_capacity_max,
      assets_needed: formData.assets_needed || [],
      event_type: formData.event_type,
      event_status: formData.event_status || 'private_pending',
      duration: formData.duration,
      address: formData.address,
      street_number: formData.street_number,
      street_name: formData.street_name,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      website: formData.website,
      instagram_handle: formData.instagram_handle,
      // owner_id: session.user.id, // owner_id should not change on update
      // user_id: session.user.id, // user_id should not change on update
      // is_active: true, // is_active should likely be managed elsewhere or not updated here
    })
    .eq('id', formData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }

  return data;
}

export const useUpdateEvent = () => {
  return useMutation({
    mutationFn: updateEvent,
  });
}; 