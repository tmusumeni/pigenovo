import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Github, Linkedin, Twitter } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface FooterContent {
  id?: string;
  section_key: string;
  section_title: string;
  content: string;
  link_url?: string;
}

export function DashboardFooter() {
  const [footerContent, setFooterContent] = useState<FooterContent[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchFooterContent();
  }, []);

  const fetchFooterContent = async () => {
    try {
      const { data, error } = await supabase
        .from('footer_content')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching footer content:', error);
        return;
      }

      setFooterContent(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group footer content by category
  const getContentByKey = (key: string) => {
    return footerContent.find(item => item.section_key === key);
  };

  const getLinkItems = (prefix: string) => {
    return footerContent
      .filter(item => item.section_key.startsWith(prefix))
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  };

  const quickLinks = getLinkItems('footer_link_');
  const resourceLinks = getLinkItems('footer_resource_');
  const extraSections = footerContent.filter(item =>
    ![
      'footer_about',
      'footer_about_title',
      'footer_contact_email',
      'footer_contact_phone',
      'footer_copyright'
    ].includes(item.section_key) &&
    !item.section_key.startsWith('footer_link_') &&
    !item.section_key.startsWith('footer_resource_')
  );

  return (
    <footer className="border-t bg-card/50 py-8 px-8 mt-8">
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">Loading footer...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* About Section */}
              <div>
                <h3 className="font-semibold mb-4 text-foreground">
                  {getContentByKey('footer_about_title')?.content || 'About PigEvoST'}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {getContentByKey('footer_about')?.content || 'Empowering traders and investors with advanced tools for financial success and wealth creation.'}
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold mb-4 text-foreground">Quick Links</h3>
                {quickLinks.length > 0 ? (
                  <ul className="space-y-2">
                    {quickLinks.map(link => (
                      <li key={link.section_key}>
                        <a href={link.link_url || '#'} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {link.section_title || link.content || link.section_key}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Add footer links in admin.</p>
                )}
              </div>

              {/* Resources */}
              <div>
                <h3 className="font-semibold mb-4 text-foreground">Resources</h3>
                {resourceLinks.length > 0 ? (
                  <ul className="space-y-2">
                    {resourceLinks.map(resource => (
                      <li key={resource.section_key}>
                        <a href={resource.link_url || '#'} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                          {resource.section_title || resource.content || resource.section_key}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Add footer resources in admin.</p>
                )}
              </div>

              {/* Contact & Social */}
              <div>
                <h3 className="font-semibold mb-4 text-foreground">Connect</h3>
                <div className="flex gap-3 mb-4">
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Github className="h-5 w-5" />
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{getContentByKey('footer_contact_email')?.content || 'support@pigenovo.st'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{getContentByKey('footer_contact_phone')?.content || '+1 (234) 567-8900'}</span>
                  </div>
                </div>
              </div>
            </div>

            {extraSections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {extraSections.map(section => (
                  <div key={section.section_key} className="rounded-xl border p-4 bg-muted/50">
                    <h3 className="font-semibold mb-3 text-foreground">{section.section_title || section.section_key}</h3>
                    <p className="text-sm text-muted-foreground">{section.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-muted-foreground">
                  &copy; {currentYear} {getContentByKey('footer_copyright')?.content || 'PigEvoST. All rights reserved.'}
                </p>
                <div className="flex gap-4">
                  <span className="text-xs text-muted-foreground">Built with ❤️ for traders</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
