-- Add notification and privacy settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{"pushEnabled": true, "emailDigest": false, "newPlaces": true, "recommendations": true}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"shareLocation": true, "personalizedAds": false, "analyticsEnabled": true}'::jsonb;