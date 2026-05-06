import React, { useEffect, useState } from 'react';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Youtube, X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { LOGO_URL } from '@/lib/constants';
import { supabase } from '../supabaseClient';

interface FooterContentItem {
  id?: string;
  section_key: string;
  section_title: string;
  content: string;
  link_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [footerContent, setFooterContent] = useState<FooterContentItem[]>([]);

  useEffect(() => {
    const fetchFooterContent = async () => {
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
    };

    fetchFooterContent();
  }, []);

  const socialItems = [
    { key: 'footer_social_facebook', Icon: Facebook, label: 'Facebook' },
    { key: 'footer_social_twitter', Icon: Twitter, label: 'Twitter' },
    { key: 'footer_social_youtube', Icon: Youtube, label: 'YouTube' },
    { key: 'footer_social_x', Icon: X, label: 'X' },
    { key: 'footer_social_linkedin', Icon: Linkedin, label: 'LinkedIn' }
  ].map((social) => {
    const item = footerContent.find((contentItem) => contentItem.section_key === social.key);
    return {
      ...social,
      url: item?.link_url || '#',
      active: !!item?.link_url
    };
  });

  return (
    <footer className="bg-card border-t mt-auto py-8 md:py-12 w-full">
      <div className="max-w-full mx-auto px-4 md:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={LOGO_URL} 
                alt="PiGenovo" 
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="font-bold text-lg">PiGenovo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A comprehensive platform for trading, earning, proformas, invoices and managing your financial transactions seamlessly.
            </p>
            <div className="flex gap-3 pt-2">
              {socialItems.filter((social) => social.active).map((social) => (
                <a
                  key={social.key}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="p-2 bg-muted rounded-lg hover:bg-primary/10 transition"
                  aria-label={social.label}
                >
                  <social.Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition">Dashboard</a></li>
              <li><a href="#" className="hover:text-primary transition">Trading</a></li>
              <li><a href="#" className="hover:text-primary transition">Wallet</a></li>
              <li><a href="#" className="hover:text-primary transition">Support</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition">API Reference</a></li>
              <li><a href="#" className="hover:text-primary transition">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition">FAQ</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:support@pigenovo.com" className="hover:text-primary transition">
                  support@pigenovo.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:+250788984216" className="hover:text-primary transition">
                  +250 788984216
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Kigali, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-8"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-1">
            Made with Gisenyihits <Heart className="h-4 w-4 text-red-500" /> by PiGenovo Team © {currentYear}
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition">Terms of Service</a>
            <a href="#" className="hover:text-primary transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
