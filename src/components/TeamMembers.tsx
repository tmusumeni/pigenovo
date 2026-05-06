import React, { useState, useEffect } from 'react';
import { Mail, Linkedin, Globe } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  bio: string;
  linkedin_url?: string;
  twitter_url?: string;
}

interface JoinTeamData {
  title: string;
  description: string;
  button_text: string;
  button_link: string;
}

export function TeamMembers() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [joinTeamData, setJoinTeamData] = useState<JoinTeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
    fetchJoinTeamSettings();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('position_order', { ascending: true });

      if (error) {
        console.error('Error fetching team members:', error);
        return;
      }

      setTeam(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinTeamSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('join_team_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching join team settings:', error);
        return;
      }

      setJoinTeamData(data);
    } catch (err) {
      console.error('Error:', err);
    }
  };


  return (
    <section className="py-12 px-8 bg-gradient-to-b from-background to-card/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-3 text-foreground">Our Team</h2>
          <p className="text-muted-foreground text-lg">Meet the talented people building PigEvoST</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">Loading team members...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member) => (
                <div 
                  key={member.id}
                  className="group rounded-lg border bg-card/50 p-6 hover:bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="w-full aspect-square mb-4 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {member.avatar ? (
                      <img 
                        src={member.avatar} 
                        alt={member.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-5xl text-muted-foreground font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-1 text-foreground">{member.name}</h3>
                  <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
                  
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 h-10">
                    {member.bio}
                  </p>

                  <div className="flex gap-3 pt-4 border-t">
                    <a 
                      href={`mailto:${member.email}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Send email"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="text-xs font-medium">Email</span>
                    </a>
                    <button 
                      className="flex items-center justify-center p-2 rounded-md bg-card border hover:border-primary/50 hover:bg-card text-muted-foreground transition-colors"
                      title="View profile"
                    >
                      <Linkedin className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {joinTeamData && (
              <div className="mt-12 p-8 rounded-lg bg-primary/5 border border-primary/20">
                <h3 className="text-xl font-semibold mb-2 text-foreground">{joinTeamData.title}</h3>
                <p className="text-muted-foreground mb-4">
                  {joinTeamData.description}
                </p>
                <a 
                  href={joinTeamData.button_link}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  {joinTeamData.button_text}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
