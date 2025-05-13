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
  image_file?: File;
  event_status?: "private_pending" | "public_pending" | "public_approved" | "private_approved";
}

export async function createEvent(formData: EventFormData) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log('Creating event');
  // First create the event
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
      event_status: formData.event_status || 'private_pending'
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Handle image upload if provided
  if (formData.image_file && data.id) {
    console.log('Uploading image to storage');
    const fileExt = formData.image_file.name.split('.').pop();
    const filePath = `event-photos/${data.id}/${Date.now()}.${fileExt}`;
    
    // Upload the image to storage
    const { error: uploadError } = await supabase
      .storage
      .from('event-photos')
      .upload(filePath, formData.image_file, {
        upsert: true,
        contentType: formData.image_file.type
      });
    
    if (uploadError) {
      console.error('Error uploading event image:', uploadError);
      // We don't throw here to avoid failing the entire event creation
    } else {
      // Update the event with the image path
      const { error: updateError } = await supabase
        .from('events')
        .update({ image_url: filePath })
        .eq('id', data.id);
      
      if (updateError) {
        console.error('Error updating event with image:', updateError);
      }
    }
  }

  return data;
}

export const useCreateEvent = () => {
  return useMutation({
    mutationFn: createEvent,
  });
}; 