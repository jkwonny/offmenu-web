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
    }
  ]
}; 