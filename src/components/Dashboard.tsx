import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { TradingExchange } from './TradingExchange';
import { WatchEarn } from './WatchEarn';
import { AIAssistant } from './AIAssistant';
import { AdminPanel } from './AdminPanel';
import { Wallet } from './Wallet';
import { Proformas } from './Proformas';
import { Invoices } from './Invoices';
import { Reports } from './Reports';
import { LanguageSelector } from './LanguageSelector';
import { RealtimeFeed } from './RealtimeFeed';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, User, Menu, X, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import logoImage from '@/assets/images/logo.png';

export function Dashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({ tin_number: '', company_name: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    let currentProfile = data;

    if (error && error.code === 'PGRST116') { // Record not found
      // Create missing profile
      const { data: newProfile } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || user.user_metadata?.email,
        full_name: user.user_metadata?.full_name || 'User',
        role: user.email === 'tmusumeni@gmail.com' ? 'admin' : 'user'
      }).select().single();
      
      // Ensure wallet exists
      await supabase.from('wallets').upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });
      
      currentProfile = newProfile;
    } else if (data && user.email === 'tmusumeni@gmail.com' && data.role !== 'admin') {
      // Sync admin role if missing in DB
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id)
        .select()
        .single();
      currentProfile = updatedProfile;
    }
    
    setProfile(currentProfile);
    setEditFormData({
      tin_number: currentProfile?.tin_number || '',
      company_name: currentProfile?.company_name || ''
    });
  };

  const handleEditProfileClick = () => {
    setEditFormData({
      tin_number: profile?.tin_number || '',
      company_name: profile?.company_name || ''
    });
    setShowEditProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      console.log('Saving TIN and Company Name:', editFormData);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          tin_number: editFormData.tin_number || null,
          company_name: editFormData.company_name || null
        })
        .eq('id', user.id)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(error.message || 'Failed to update profile');
      }

      // Refetch to confirm save
      const { data: refreshedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching refreshed profile:', fetchError);
        throw fetchError;
      }

      console.log('Refreshed profile from DB:', refreshedProfile);
      
      // Update local state with database data
      setProfile(refreshedProfile);
      setEditFormData({ tin_number: '', company_name: '' });

      setShowEditProfile(false);
      alert('✅ Profile updated successfully!');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      alert(`Error saving profile: ${error.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'admin' || user.email === 'tmusumeni@gmail.com';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview user={user} setActiveTab={setActiveTab} />;
      case 'trading':
        return <TradingExchange user={user} />;
      case 'watch-earn':
        return <WatchEarn user={user} />;
      case 'ai-assistant':
        return <AIAssistant user={user} />;
      case 'wallet':
        return <Wallet user={user} />;
      case 'proformas':
        return <Proformas setActiveTab={setActiveTab} />;
      case 'invoices':
        return <Invoices />;
      case 'reports':
        return <Reports />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <DashboardOverview user={user} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block w-64 sticky top-0 h-screen">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isAdmin={isAdmin} 
          onSignOut={handleSignOut}
          onMenuClick={() => setSidebarOpen(false)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      {/* Mobile/Tablet Sidebar */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-screen w-64 z-40 lg:hidden"
      >
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSidebarOpen(false);
          }}
          isAdmin={isAdmin} 
          onSignOut={handleSignOut}
          onMenuClick={() => setSidebarOpen(false)}
        />
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          {/* Mobile Menu Button + Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            <div className="flex items-center gap-2">
              <img 
                src={logoImage} 
                alt="PiGenovo Logo" 
                className="h-8 w-8 object-contain rounded"
              />
              <span className="font-bold text-lg truncate">PiGenovo</span>
            </div>
          </div>

          <div className="flex-1 max-w-md relative hidden md:block ml-4 lg:ml-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-10 bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card" />
            </Button>
            <div className="h-8 w-px bg-border mx-2 hidden md:block" />
            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold">{profile?.full_name || user.email || user.phone}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{isAdmin ? 'Admin' : (profile?.role || 'User')}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 text-xs md:text-base">
                  {(user.email?.[0] || user.phone?.[0] || 'U').toUpperCase()}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleEditProfileClick}
                  title="Edit Profile (TIN & Company)"
                  className="gap-1"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditProfile(false)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your TIN and Company information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <Label htmlFor="tin_number">Tax Identification Number (TIN)</Label>
                  <Input
                    id="tin_number"
                    placeholder="Enter your TIN"
                    value={editFormData.tin_number}
                    onChange={(e) => setEditFormData({ ...editFormData, tin_number: e.target.value })}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used in professional documents (proformas, invoices)
                  </p>
                </div>

                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    placeholder="Enter your company name"
                    value={editFormData.company_name}
                    onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Displayed as sender information in documents
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1"
                  >
                    {savingProfile ? '💾 Saving...' : '💾 Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditProfile(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
