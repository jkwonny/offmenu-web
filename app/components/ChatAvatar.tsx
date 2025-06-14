import React from 'react';
import Image from 'next/image';
import Avatar from './Avatar';

interface ChatAvatarProps {
    // User info
    recipientProfilePicture?: string | null;
    senderProfilePicture?: string | null;
    recipientName?: string;
    senderName?: string;
    // Venue info (the venue this chat room is about)
    venueImage?: string | null;
    venueName?: string;
    // Display settings
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    currentUserId?: string;
    senderId?: string;
    recipientId?: string;
    // Context for determining behavior
    useVenueImage?: boolean; // Explicitly control when to use venue images (left container only)
}

const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
};

export default function ChatAvatar({
    recipientProfilePicture,
    senderProfilePicture,
    recipientName = 'Unknown',
    senderName = 'Unknown',
    venueImage,
    venueName,
    size = 'md',
    className = '',
    currentUserId,
    senderId,
}: ChatAvatarProps) {
    // If explicitly told to use venue images (for left container only)
    if (venueImage) {
        console.log('venueImage', venueImage);
        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
                <Image
                    src={venueImage}
                    alt={venueName || 'Venue'}
                    width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
                    height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
                    className="object-cover w-full h-full"
                />
            </div>
        );
    }
    
    // Default behavior: show the other person's profile picture
    // If current user is sender, show recipient's avatar
    // If current user is recipient, show sender's avatar
    const isCurrentUserSender = currentUserId === senderId;
    const targetProfilePicture = isCurrentUserSender ? recipientProfilePicture : senderProfilePicture;
    const targetName = isCurrentUserSender ? recipientName : senderName;
    
    return (
        <Avatar
            profilePicture={targetProfilePicture}
            name={targetName}
            size={size}
            className={className}
        />
    );
} 