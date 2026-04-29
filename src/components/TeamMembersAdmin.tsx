import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  description: string;
  profile_image_url: string;
  order_position: number;
  is_active: boolean;
}

export function TeamMembersAdmin() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    profile_image_url: '',
    order_position: 0,
    is_active: true
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        title: member.title,
        description: member.description || '',
        profile_image_url: member.profile_image_url || '',
        order_position: member.order_position,
        is_active: member.is_active
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        title: '',
        description: '',
        profile_image_url: '',
        order_position: teamMembers.length,
        is_active: true
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.title) {
      toast.error('Name and Title are required');
      return;
    }

    setSaving(true);
    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update(formData)
          .eq('id', editingMember.id);

        if (error) throw error;
        toast.success('✅ Team member updated successfully');
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert([formData]);

        if (error) throw error;
        toast.success('✅ Team member added successfully');
      }

      setShowForm(false);
      await fetchTeamMembers();
    } catch (error: any) {
      console.error('Error saving team member:', error);
      toast.error(error.message || 'Failed to save team member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('✅ Team member deleted successfully');
      await fetchTeamMembers();
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      toast.error(error.message || 'Failed to delete team member');
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);

      if (error) throw error;
      toast.success(member.is_active ? '✅ Team member hidden' : '✅ Team member shown');
      await fetchTeamMembers();
    } catch (error: any) {
      console.error('Error updating team member:', error);
      toast.error(error.message || 'Failed to update team member');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading team members...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>👥 Team Members</CardTitle>
            <CardDescription>Manage team members for the About section</CardDescription>
          </div>
          <Button 
            onClick={() => handleOpenForm()}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No team members yet</p>
              <Button 
                onClick={() => handleOpenForm()}
                variant="outline"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {member.profile_image_url && (
                      <img
                        src={member.profile_image_url}
                        alt={member.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.title}</p>
                    {!member.is_active && (
                      <span className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">Hidden</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenForm(member)}
                    className="gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(member)}
                    className="text-muted-foreground"
                  >
                    {member.is_active ? '👁️' : '🙈'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(member.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingMember ? '✏️ Edit Team Member' : '➕ Add Team Member'}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={255}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="title">Title/Position *</Label>
                <Input
                  id="title"
                  placeholder="e.g., CEO, HR Manager, Developer"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Bio/Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description or bio..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-2 h-24 resize-none"
                />
              </div>

              <div>
                <Label htmlFor="profile_image">Profile Image URL</Label>
                <Input
                  id="profile_image"
                  placeholder="https://example.com/image.jpg"
                  value={formData.profile_image_url}
                  onChange={(e) => setFormData({ ...formData, profile_image_url: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload to Supabase Storage or use external image URL
                </p>
              </div>

              <div>
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order_position}
                  onChange={(e) => setFormData({ ...formData, order_position: parseInt(e.target.value) })}
                  min="0"
                  className="mt-2"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer text-sm">
                  Show in About section
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Member'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
