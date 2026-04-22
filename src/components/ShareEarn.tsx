import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Share2, Upload, CheckCircle, Clock, XCircle, ExternalLink, Coins, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ad {
  id: string;
  title: string;
  image_url: string;
  link: string;
  reward_amount: number;
  description: string;
}

interface AdShare {
  id: string;
  ad_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function ShareEarn({ user }: { user: any }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [myShares, setMyShares] = useState<Record<string, AdShare>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [shareProofImage, setShareProofImage] = useState<Record<string, File | null>>({});
  const [shareProofLink, setShareProofLink] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data: sharesData, error: sharesError } = await supabase
        .from('ad_shares')
        .select('*')
        .eq('user_id', user.id);

      if (adsError) throw adsError;
      if (sharesError) throw sharesError;

      setAds(adsData || []);

      const sharesMap: Record<string, AdShare> = {};
      sharesData?.forEach(s => {
        sharesMap[s.ad_id] = s;
      });
      setMyShares(sharesMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const msLeft = expires.getTime() - now.getTime();
    
    if (msLeft <= 0) return 'Expired';
    
    const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
    return `${hoursLeft}h left`;
  };

  const handleShareAd = async (adId: string) => {
    try {
      setUploading(adId);
      const proofImage = shareProofImage[adId];
      const proofLink = shareProofLink[adId];

      if (!proofImage && !proofLink) {
        toast.error('Please upload an image or add a link as proof');
        return;
      }

      let proofImageUrl = '';

      // Upload proof image if provided
      if (proofImage) {
        const fileExt = proofImage.name.split('.').pop();
        const fileName = `ad-share-${user.id}-${adId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('proofs')
          .upload(fileName, proofImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('proofs')
          .getPublicUrl(fileName);

        proofImageUrl = urlData.publicUrl;
      }

      // Create ad share record
      const { data: shareData, error: dbError } = await supabase
        .from('ad_shares')
        .insert({
          ad_id: adId,
          user_id: user.id,
          proof_image_url: proofImageUrl || null,
          proof_link: proofLink || null,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setMyShares(prev => ({ ...prev, [adId]: shareData }));
      setShareProofImage(prev => ({ ...prev, [adId]: null }));
      setShareProofLink(prev => ({ ...prev, [adId]: '' }));
      toast.success('Proof submitted! Waiting for admin approval.');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to submit proof');
    } finally {
      setUploading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'rejected': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'pending': return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending': return <Clock className="h-5 w-5 text-amber-600 animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Share & Earn</h2>
          <p className="text-muted-foreground">Post ads on WhatsApp status within 24h to earn RWF.</p>
        </div>
        <div className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-200 px-4 py-2 rounded-xl flex items-center gap-2">
          <Coins className="h-5 w-5" />
          <span className="font-bold">Up to 500+ RWF / Ad</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-xl" />
              <CardHeader><div className="h-6 bg-muted rounded w-3/4" /></CardHeader>
            </Card>
          ))
        ) : ads.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
            <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No active ads at the moment.</p>
          </div>
        ) : (
          ads.map((ad) => {
            const share = myShares[ad.id];
            const isShared = !!share;

            return (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`overflow-hidden ${isShared ? getStatusColor(share.status) : ''} transition-all`}>
                  {/* Ad Image */}
                  <div className="relative w-full h-48 overflow-hidden bg-muted">
                    <img 
                      src={ad.image_url} 
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      {ad.reward_amount} RWF
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-lg">{ad.title}</CardTitle>
                    {ad.description && (
                      <CardDescription className="text-xs">{ad.description}</CardDescription>
                    )}
                  </CardHeader>

                  <CardFooter className="flex flex-col gap-3">
                    {isShared ? (
                      <div className="w-full space-y-3">
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 flex items-center gap-3">
                          {getStatusIcon(share.status)}
                          <div className="flex-1">
                            <p className="text-xs font-bold capitalize">{share.status}</p>
                            {share.status === 'pending' && (
                              <p className="text-[10px] text-muted-foreground">{formatTimeLeft(share.created_at)}</p>
                            )}
                          </div>
                        </div>
                        {share.status === 'rejected' && (
                          <Button 
                            variant="outline" 
                            className="w-full text-xs"
                            onClick={() => {
                              setMyShares(prev => {
                                const newShares = { ...prev };
                                delete newShares[ad.id];
                                return newShares;
                              });
                              setShareProofImage(prev => ({ ...prev, [ad.id]: null }));
                              setShareProofLink(prev => ({ ...prev, [ad.id]: '' }));
                            }}
                          >
                            Try Again
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="w-full space-y-3">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => window.open(ad.link, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Ad Link
                        </Button>

                        <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-100 uppercase">Submit Proof</p>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`proof-img-${ad.id}`} className="text-[10px]">
                              Upload Status Screenshot
                            </Label>
                            <Input
                              id={`proof-img-${ad.id}`}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setShareProofImage(prev => ({ ...prev, [ad.id]: e.target.files![0] }));
                                }
                              }}
                              disabled={uploading === ad.id}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="relative py-1">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-blue-300 dark:border-blue-700"></div></div>
                            <div className="relative flex justify-center"><span className="bg-blue-50 dark:bg-blue-950 px-2 text-[10px]">Or</span></div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`proof-link-${ad.id}`} className="text-[10px]">
                              Add Link Proof (Optional)
                            </Label>
                            <Input
                              id={`proof-link-${ad.id}`}
                              placeholder="https://..."
                              value={shareProofLink[ad.id] || ''}
                              onChange={(e) => setShareProofLink(prev => ({ ...prev, [ad.id]: e.target.value }))}
                              disabled={uploading === ad.id}
                              className="h-8 text-xs"
                            />
                          </div>

                          <Button 
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => handleShareAd(ad.id)}
                            disabled={uploading === ad.id || (!shareProofImage[ad.id] && !shareProofLink[ad.id])}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            {uploading === ad.id ? 'Submitting...' : 'Submit Proof'}
                          </Button>
                        </div>

                        <div className="p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-amber-700 dark:text-amber-200">
                            Post this image on your WhatsApp status within 24 hours and upload proof.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
