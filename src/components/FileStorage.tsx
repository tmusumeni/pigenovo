import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, File, Trash2, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function FileStorage({ user }: { user: any }) {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      // List files in the 'private-uploads' bucket for the current user's folder
      const { data, error } = await supabase.storage
        .from('private-uploads')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'desc' },
        });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select a file to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('private-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast.success('File uploaded successfully!');
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload. Make sure the "private-uploads" bucket exists.');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from('private-uploads')
        .remove([`${user.id}/${fileName}`]);

      if (error) throw error;
      toast.success('File deleted');
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getSignedUrl = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('private-uploads')
        .createSignedUrl(`${user.id}/${fileName}`, 60); // 60 seconds expiry

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Private Storage (Signed URLs)
          </CardTitle>
          <CardDescription>
            Files are stored in a private bucket. Access is granted only via time-limited signed URLs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center w-full mb-8">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">Any file type (max 50MB)</p>
              </div>
              <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
            </label>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
                No files uploaded yet.
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {files.map((file) => (
                  <motion.div
                    key={file.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <File className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.metadata.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => getSignedUrl(file.name)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFile(file.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">Storage Setup Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            1. Create a bucket named <code className="bg-muted px-1 rounded">private-uploads</code> in Supabase Storage.<br />
            2. Set the bucket to <strong>Private</strong>.<br />
            3. Add these RLS policies:
          </p>
          <pre className="bg-black text-white p-4 rounded-lg text-xs overflow-x-auto">
{`-- Policy for viewing/listing files
create policy "Users can view their own folder"
  on storage.objects for select
  using ( bucket_id = 'private-uploads' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Policy for uploading files
create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check ( bucket_id = 'private-uploads' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Policy for deleting files
create policy "Users can delete their own folder"
  on storage.objects for delete
  using ( bucket_id = 'private-uploads' AND (storage.foldername(name))[1] = auth.uid()::text );`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
