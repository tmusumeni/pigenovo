import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'motion/react';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  description: string;
  profile_image_url: string;
  order_position: number;
}

export function AboutSection() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 px-4 py-6 border-t">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">
          👥 About Team
        </h3>
      </div>

      <div className="space-y-3">
        {teamMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-default">
              {member.profile_image_url && (
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={member.profile_image_url}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-3">
                <p className="font-semibold text-sm line-clamp-1">{member.name}</p>
                <p className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded mt-1 inline-block">
                  {member.title}
                </p>
                {member.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {member.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
