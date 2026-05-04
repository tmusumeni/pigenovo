import React from 'react';
import { Mail, Linkedin, Globe } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  bio: string;
}

export function TeamMembers() {
  const team: TeamMember[] = [
    {
      id: '1',
      name: 'Themba Musumeni',
      role: 'Lead Developer & Founder',
      email: 'themba@pigenovo.st',
      avatar: '👨‍💻',
      bio: 'Full-stack developer with expertise in React, TypeScript, and blockchain integration'
    },
    {
      id: '2',
      name: 'Alex Johnson',
      role: 'Product Manager',
      email: 'alex@pigenovo.st',
      avatar: '👨‍💼',
      bio: 'Passionate about user experience and building products that traders love'
    },
    {
      id: '3',
      name: 'Sarah Chen',
      role: 'Smart Contract Engineer',
      email: 'sarah@pigenovo.st',
      avatar: '👩‍💻',
      bio: 'Blockchain specialist ensuring secure and efficient smart contract deployment'
    },
    {
      id: '4',
      name: 'Marcus Williams',
      role: 'DevOps & Infrastructure',
      email: 'marcus@pigenovo.st',
      avatar: '👨‍🔧',
      bio: 'Ensuring platform reliability, security, and scalability for millions of users'
    }
  ];

  return (
    <section className="py-12 px-8 bg-gradient-to-b from-background to-card/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-3 text-foreground">Our Team</h2>
          <p className="text-muted-foreground text-lg">Meet the talented people building PigEvoST</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member) => (
            <div 
              key={member.id}
              className="group rounded-lg border bg-card/50 p-6 hover:bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {member.avatar}
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

        <div className="mt-12 p-8 rounded-lg bg-primary/5 border border-primary/20">
          <h3 className="text-xl font-semibold mb-2 text-foreground">Join Our Team</h3>
          <p className="text-muted-foreground mb-4">
            We're always looking for talented developers, designers, and product specialists to join our mission.
          </p>
          <a 
            href="#"
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Globe className="h-4 w-4" />
            View Open Positions
          </a>
        </div>
      </div>
    </section>
  );
}
