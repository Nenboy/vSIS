import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface InstitutionSettings {
  name: string;
  address: string;
  phone: string;
  website: string;
  logo: string;
}

export interface CardSettings {
  validityYears: number;
  includeQRCode: boolean;
  includeBarcode: boolean;
  cardTemplate: string;
  securityFeatures: boolean;
}

export interface SystemSettings {
  autoBackup: boolean;
  backupFrequency: string;
  requirePhotoApproval: boolean;
  enableEmailNotifications: boolean;
  maxFileSize: number;
}

export interface AppSettings {
  id?: string;
  institution: InstitutionSettings;
  card: CardSettings;
  system: SystemSettings;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          institution: data.institution,
          card: data.card,
          system: data.system,
        });
      } else {
        // Default settings if none exist
        setSettings({
          institution: {
            name: 'University of Excellence',
            address: '123 University Avenue, Academic City',
            phone: '+1 (555) 123-4567',
            website: 'www.university.edu',
            logo: '',
          },
          card: {
            validityYears: 4,
            includeQRCode: true,
            includeBarcode: false,
            cardTemplate: 'standard',
            securityFeatures: true,
          },
          system: {
            autoBackup: true,
            backupFrequency: 'weekly',
            requirePhotoApproval: false,
            enableEmailNotifications: true,
            maxFileSize: 2,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, error, refetch: fetchSettings };
}