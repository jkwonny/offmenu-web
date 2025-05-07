"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NavBar from "../components/NavBar";
import { useUser } from "../context/UserContext";
import { supabase } from "../lib/supabase";
import { useProfilePictureUrl } from "../lib/queries/user";

export default function Profile() {
    const router = useRouter();
    const { user, userProfile, isLoading, signOut, updateUserProfile } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data: fetchedProfilePictureUrl } = useProfilePictureUrl(userProfile?.profile_picture);

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [about, setAbout] = useState("");
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [hasChanged, setHasChanged] = useState(false);

    // Load user data when available
    useEffect(() => {
        if (userProfile) {
            setName(userProfile.name || "");
            setPhone(userProfile.phone || "");
            setAbout(userProfile.about || "");

            // Use the profile picture URL from React Query
            if (fetchedProfilePictureUrl) {
                setProfilePictureUrl(fetchedProfilePictureUrl);
            }
        }
    }, [userProfile, fetchedProfilePictureUrl]);

    // Check if any fields have changed
    useEffect(() => {
        if (userProfile) {
            const hasNameChanged = name !== (userProfile.name || "");
            const hasPhoneChanged = phone !== (userProfile.phone || "");
            const hasAboutChanged = about !== (userProfile.about || "");
            const hasPictureChanged = !!profilePicFile;

            setHasChanged(hasNameChanged || hasPhoneChanged || hasAboutChanged || hasPictureChanged);
        }
    }, [name, phone, about, profilePicFile, userProfile]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/auth/sign-in");
        }
    }, [user, isLoading, router]);

    // Function to format phone number input
    const formatPhoneNumber = (input: string) => {
        // Strip all non-numeric characters
        const phoneNumber = input.replace(/\D/g, '');

        // Limit to 10 digits (US phone number)
        const limitedNumber = phoneNumber.slice(0, 10);

        // Format the number based on its length
        if (limitedNumber.length <= 3) {
            return limitedNumber;
        } else if (limitedNumber.length <= 6) {
            return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3)}`;
        } else {
            return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3, 6)}-${limitedNumber.slice(6, 10)}`;
        }
    };

    // Handle phone input change
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedPhone = formatPhoneNumber(e.target.value);
        setPhone(formattedPhone);
    };

    // Trigger file input click
    const handleProfilePictureClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setError('Please upload a JPEG, PNG, or WebP image.');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should be less than 5MB.');
                return;
            }

            setProfilePicFile(file);
            // Create a preview URL
            setProfilePictureUrl(URL.createObjectURL(file));
            setError(null);
        }
    };

    // Remove profile picture
    const handleRemovePicture = () => {
        setProfilePictureUrl(null);
        setProfilePicFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Upload profile picture to Supabase storage
    const uploadProfilePicture = async (): Promise<string | null> => {
        if (!profilePicFile || !user) return null;

        try {
            // Create a unique file path
            const fileExt = profilePicFile.name.split('.').pop();
            const filePath = `${user.id}/${Date.now()}.${fileExt}`;

            // Upload the file
            const { error } = await supabase
                .storage
                .from('user-profile-pic')
                .upload(filePath, profilePicFile, {
                    upsert: true,
                    contentType: profilePicFile.type
                });

            if (error) {
                throw error;
            }

            return filePath;
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            setError('Failed to upload profile picture');
            return null;
        }
    };

    // Validate phone number
    const validatePhone = () => {
        if (phone) {
            const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
            if (!phoneRegex.test(phone)) {
                setError('Please enter a valid US phone number');
                return false;
            }
        }
        return true;
    };

    // Save profile changes
    const handleSave = async () => {
        // Clear previous messages
        setError(null);
        setSuccessMessage(null);

        // Validate phone number
        if (!validatePhone()) {
            console.log('phone number', phone)
            return;
        }

        try {
            setIsSaving(true);

            // Upload profile picture if changed
            let profilePicturePath = userProfile?.profile_picture || null;
            if (profilePicFile) {
                profilePicturePath = await uploadProfilePicture();
            }

            // Update user profile
            const { success, error } = await updateUserProfile({
                name,
                phone,
                about,
                profile_picture: profilePicturePath
            });

            if (!success || error) {
                throw error || new Error('Failed to update profile');
            }

            setSuccessMessage('Profile updated successfully');
            setProfilePicFile(null); // Reset after successful upload
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle log out
    const handleLogout = async () => {
        await signOut();
        router.push('/auth/sign-in');
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FFF9F5]">
                <NavBar />
                <div className="max-w-4xl mx-auto p-8 mt-8 flex justify-center">
                    <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in the useEffect
    }

    return (
        <div className="min-h-screen bg-[#FFF9F5]">
            <NavBar />
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">Personal Information</h1>

                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    {/* Profile Picture */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div
                                className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer"
                                onClick={handleProfilePictureClick}
                            >
                                {profilePictureUrl ? (
                                    <Image
                                        src={profilePictureUrl as string}
                                        alt="Profile"
                                        width={128}
                                        height={128}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <svg
                                        className="h-16 w-16 text-gray-400"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </div>
                            <button
                                className="absolute bottom-0 right-0 bg-gray-600 rounded-full p-2 text-white"
                                onClick={handleProfilePictureClick}
                                type="button"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                    />
                                </svg>
                            </button>
                            {profilePictureUrl && (
                                <button
                                    className="absolute top-0 right-0 bg-red-500 rounded-full p-1 text-white"
                                    onClick={handleRemovePicture}
                                    type="button"
                                    aria-label="Remove profile picture"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg, image/png, image/webp"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-md bg-gray-100"
                            />
                        </div>

                        {/* Phone and Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <div className="relative">
                                    <input
                                        id="phone"
                                        type="text"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="(xxx) xxx-xxxx"
                                        className="w-full p-3 pr-12 border border-gray-200 rounded-md bg-gray-100"
                                    />
                                    {phone && (
                                        <button
                                            type="button"
                                            onClick={() => setPhone('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                                        >
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <div className="relative">
                                    <input
                                        id="email"
                                        type="email"
                                        value={user.email || ''}
                                        readOnly
                                        className="w-full p-3 pr-12 border border-gray-200 rounded-md bg-gray-100"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* About */}
                        <div>
                            <label htmlFor="about" className="block text-sm font-medium text-gray-700 mb-1">
                                About
                            </label>
                            <textarea
                                id="about"
                                value={about}
                                onChange={(e) => setAbout(e.target.value)}
                                rows={6}
                                placeholder="Enter something about yourself"
                                className="w-full p-3 border border-gray-200 rounded-md bg-gray-100 resize-none"
                            />
                        </div>

                        {/* Error and Success Messages */}
                        {error && (
                            <div className="p-3 bg-red-100 text-red-700 rounded-md">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3 bg-green-100 text-green-700 rounded-md">
                                {successMessage}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4">
                            <button
                                type="button"
                                onClick={() => {/* Implement delete profile logic */ }}
                                className="text-gray-700 hover:text-red-700 transition-colors"
                            >
                                Delete Profile
                            </button>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!hasChanged || isSaving}
                                    className={`px-5 py-2 rounded-md ${hasChanged && !isSaving
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        } transition-colors`}
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 