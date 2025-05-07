/*
  This file specifies the storage configuration for Supabase.
  It is used when deploying to Supabase.
*/

export const storageConfig = {
  buckets: [
    {
      name: 'venue-images',
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    },
    {
      name: 'chat-attachments',
      public: false, // Private bucket
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    },
    {
      name: 'user-profile-pic',
      public: true, // Public for simplicity
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    }
  ],
  policies: [
    {
      name: 'Allow public access to venue-images',
      bucket: 'venue-images',
      statement: 'select',
      effect: 'allow',
      principal: 'anon'
    },
    {
      name: 'Allow authenticated users to upload to venue-images',
      bucket: 'venue-images',
      statement: 'insert',
      effect: 'allow',
      principal: 'authenticated'
    },
    {
      name: 'Allow authenticated users to access chat-attachments',
      bucket: 'chat-attachments',
      statement: 'select',
      effect: 'allow',
      principal: 'authenticated'
    },
    {
      name: 'Allow authenticated users to upload to chat-attachments',
      bucket: 'chat-attachments',
      statement: 'insert',
      effect: 'allow',
      principal: 'authenticated'
    },
    {
      name: 'Allow public access to user-profile-pic',
      bucket: 'user-profile-pic',
      statement: 'select',
      effect: 'allow',
      principal: 'anon'
    },
    {
      name: 'Allow authenticated users to upload to user-profile-pic',
      bucket: 'user-profile-pic',
      statement: 'insert',
      effect: 'allow',
      principal: 'authenticated'
    }
  ]
}; 