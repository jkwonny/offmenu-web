import React from 'react';
import Image from 'next/image';
import { useProfilePictureUrl } from '../lib/queries/user';

interface AvatarProps {
    profilePicture?: string | null;
    name?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
};

export default function Avatar({ profilePicture, name = 'Unknown', size = 'md', className = '' }: AvatarProps) {
    const { data: profilePictureUrl } = useProfilePictureUrl(profilePicture);
    
    const avatarClasses = `${sizeClasses[size]} bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center text-gray-600 uppercase font-medium ${className}`;
    
    if (profilePictureUrl) {
        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
                <Image
                    src={profilePictureUrl}
                    alt={name}
                    width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
                    height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
                    className="object-cover w-full h-full"
                />
            </div>
        );
    }
    
    return (
        <div className={avatarClasses}>
            {name.charAt(0)}
        </div>
    );
}
