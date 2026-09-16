import { supabase } from "../lib/supabase";
import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Landmark, Shield, Database, X, Clock } from 'lucide-react';
import { logActivity } from '../lib/activityLogger';
import VerificationPostsManager from './VerificationPostsManager';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [institutionSettings, setInstitutionSettings] = useState({
    name: 'University of Jos',
    address: 'Bauchi Road, Jos, Plateau State, Nigeria',
    phone: '+234 (0) 803 000 0000',
    website: 'www.unijos.edu.ng',
    logo: '/unijos-logo.png',
  });

  const [cardSettings, setCardSettings] = useState({
    validityYears: 4,
    includeQRCode: true,
    includeBarcode: false,
    cardTemplate: 'standard',
    securityFeatures: true,
  });

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: 'weekly',
    requirePhotoApproval: false,
    enableEmailNotifications: true,
    maxFileSize: 2,
  });

  const [originalInstitution, setOriginalInstitution] = useState(institutionSettings);
  const [originalCard, setOriginalCard] = useState(cardSettings);
  const [originalSystem, setOriginalSystem] = useState(systemSettings);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    const institutionChanged = JSON.stringify(institutionSettings) !== JSON.stringify(originalInstitution);
    const cardChanged = JSON.stringify(cardSettings) !== JSON.stringify(originalCard);
    const systemChanged = JSON.stringify(systemSettings) !== JSON.stringify(originalSystem);
    setIsDirty(institutionChanged || cardChanged || systemChanged);
  }, [institutionSettings, cardSettings, systemSettings, originalInstitution, originalCard, originalSystem]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        setSettingsId(data.id);
        setInstitutionSettings(data.institution);
        setCardSettings(data.card);
        setSystemSettings(data.system);
        setOriginalInstitution(data.institution);
        setOriginalCard(data.card);
        setOriginalSystem(data.system);
      } else {
        setOriginalInstitution(institutionSettings);
        setOriginalCard(cardSettings);
        setOriginalSystem(systemSettings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setNotification({ message: 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const settingsData = {
        institution: institutionSettings,
        card: cardSettings,
        system: systemSettings,
      };
      let error;
      if (settingsId) {
        const { error: updateError } = await supabase.from('settings').update(settingsData).eq('id', settingsId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('settings').insert(settingsData);
        error = insertError;
      }
      if (error) throw error;

      await logActivity('UPDATE_SETTINGS', 'settings', settingsId || 'new', settingsData);

      setNotification({ message: 'Settings saved successfully!', type: 'success' });
      setOriginalInstitution({ ...institutionSettings });
      setOriginalCard({ ...cardSettings });
      setOriginalSystem({ ...systemSettings });
      setIsDirty(false);
      await fetchSettings();
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const dismissNotification = () => setNotification(null);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Small helper for "Coming Soon" badge
  const ComingSoon = () => (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-2">
      <Clock className="w-3 h-3" />
      Coming Soon
    </span>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center justify-between p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
          style={{ minWidth: '280px', cursor: 'pointer' }}
          onClick={dismissNotification}
        >
          <span className="font-medium">{notification.message}</span>
          <button onClick={(e) => { e.stopPropagation(); dismissNotification(); }} className="ml-4 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <SettingsIcon className="h-7 w-7 sm:h-8 sm:w-8" />
            <span>System Settings</span>
          </h2>
        </div>

        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
          {/* Institution Information */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Landmark className="h-5 w-5" />
              <span>Institution Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Institution Name</label>
                <input type="text" value={institutionSettings.name}
                  onChange={(e) => setInstitutionSettings({ ...institutionSettings, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input type="text" value={institutionSettings.phone}
                  onChange={(e) => setInstitutionSettings({ ...institutionSettings, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input type="text" value={institutionSettings.address}
                  onChange={(e) => setInstitutionSettings({ ...institutionSettings, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input type="text" value={institutionSettings.website}
                  onChange={(e) => setInstitutionSettings({ ...institutionSettings, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Path</label>
                <input type="text" value={institutionSettings.logo}
                  onChange={(e) => setInstitutionSettings({ ...institutionSettings, logo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="/unijos-logo.png" />
              </div>
            </div>
          </div>

          {/* ID Card Settings */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>ID Card Settings</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Validity (Years)</label>
                <input type="number" min="1" max="10" value={cardSettings.validityYears}
                  onChange={(e) => setCardSettings({ ...cardSettings, validityYears: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                <p className="mt-1 text-xs text-gray-500">
                  Used as the default when a student's level has no preset rule
                </p>
              </div>

              {/* Coming Soon: Card Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Template <ComingSoon />
                </label>
                <select disabled value={cardSettings.cardTemplate}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-400 cursor-not-allowed">
                  <option value="standard">Standard (active)</option>
                  <option value="premium">Premium</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center">
                  <input type="checkbox" checked={cardSettings.includeQRCode}
                    onChange={(e) => setCardSettings({ ...cardSettings, includeQRCode: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-4 w-4" />
                  <span className="ml-2 text-sm text-gray-700">Include QR Code on card</span>
                  <span className="ml-2 text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={cardSettings.includeBarcode}
                    onChange={(e) => setCardSettings({ ...cardSettings, includeBarcode: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-4 w-4" />
                  <span className="ml-2 text-sm text-gray-700">Include Barcode on card</span>
                  <span className="ml-2 text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={cardSettings.securityFeatures}
                    onChange={(e) => setCardSettings({ ...cardSettings, securityFeatures: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-4 w-4" />
                  <span className="ml-2 text-sm text-gray-700">Enhanced Security Features</span>
                  <span className="ml-2 text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* System Configuration */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>System Configuration</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Photo File Size (MB)
                  <span className="ml-2 text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </label>
                <input type="number" min="1" max="10" value={systemSettings.maxFileSize}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maxFileSize: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                <p className="mt-1 text-xs text-gray-500">
                  Registration will reject photos larger than this
                </p>
              </div>

              {/* Coming Soon: Backup Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency <ComingSoon />
                </label>
                <select disabled value={systemSettings.backupFrequency}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-400 cursor-not-allowed">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center opacity-60">
                  <input type="checkbox" checked={systemSettings.autoBackup} disabled
                    className="rounded border-gray-300 text-blue-600 h-4 w-4 cursor-not-allowed" />
                  <span className="ml-2 text-sm text-gray-500">Enable Automatic Backups</span>
                  <ComingSoon />
                </label>
                <label className="flex items-center opacity-60">
                  <input type="checkbox" checked={systemSettings.requirePhotoApproval} disabled
                    className="rounded border-gray-300 text-blue-600 h-4 w-4 cursor-not-allowed" />
                  <span className="ml-2 text-sm text-gray-500">Require Photo Approval</span>
                  <ComingSoon />
                </label>
                <label className="flex items-center opacity-60">
                  <input type="checkbox" checked={systemSettings.enableEmailNotifications} disabled
                    className="rounded border-gray-300 text-blue-600 h-4 w-4 cursor-not-allowed" />
                  <span className="ml-2 text-sm text-gray-500">Enable Email Notifications</span>
                  <ComingSoon />
                </label>
              </div>
            </div>
          </div>

          <VerificationPostsManager />

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button onClick={handleSave} disabled={!isDirty || saving}
              className={`px-6 sm:px-8 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
                !isDirty || saving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}>
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}