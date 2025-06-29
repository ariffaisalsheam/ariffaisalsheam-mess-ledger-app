"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, type UserProfile as AppUserProfile } from '@/services/messService';

interface ProfileEditorProps {
    userProfile: AppUserProfile | null;
    onProfileUpdate: () => void;
    onSaveComplete?: () => void;
}

export function ProfileEditor({ userProfile, onProfileUpdate, onSaveComplete }: ProfileEditorProps) {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userProfile) {
            setName(userProfile.displayName || '');
            setImagePreview(userProfile.photoURL || null);
        }
    }, [userProfile]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        if (!userProfile) return;
        setIsSavingProfile(true);
        try {
            await updateUserProfile(userProfile.uid, {
                displayName: name,
                newImageFile: imageFile,
            });
            toast({ title: "Success", description: "Your profile has been updated." });
            onProfileUpdate();
            if (onSaveComplete) onSaveComplete();
            setImageFile(null);
        } catch (error) {
            console.error("Failed to update profile", error);
            toast({ title: "Error", description: "Could not update your profile.", variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    if (!userProfile) {
        return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card className="border-0 shadow-none">
            <CardHeader>
                <CardTitle className="font-headline">Personal Information</CardTitle>
                <CardDescription>Update your name and profile picture.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[120px_1fr] items-start">
                <div className="relative group mx-auto">
                    <Avatar className="h-28 w-28 border-2 border-primary/20">
                        <AvatarImage src={imagePreview || "https://placehold.co/120x120.png"} alt={userProfile?.displayName || ''} data-ai-hint="person portrait"/>
                        <AvatarFallback>{userProfile?.displayName?.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-1 right-1 rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera className="h-4 w-4" />
                        <span className="sr-only">Change picture</span>
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input id="displayName" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={userProfile?.email || ''} readOnly disabled />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                    {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Profile
                </Button>
            </CardFooter>
        </Card>
    );
}