import React from 'react';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Linkedin } from 'lucide-react';
import logoImage from '@/assets/images/logo.png';
import { useLanguage } from '@/lib/LanguageContext';

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t mt-auto py-8 md:py-12 w-full">
      <div className="max-w-full mx-auto px-4 md:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={logoImage} 
                alt="PiGenovo" 
                className="h-8 w-8 object-contain"
              />
              <span className="font-bold text-lg">PiGenovo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A comprehensive platform for trading, earning, and managing your financial transactions seamlessly.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="#" className="p-2 bg-muted rounded-lg hover:bg-primary/10 transition">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 bg-muted rounded-lg hover:bg-primary/10 transition">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 bg-muted rounded-lg hover:bg-primary/10 transition">
                <Linkedin className="h-4 w-4" />
              </a>
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
                <a href="tel:+250788838601" className="hover:text-primary transition">
                  +250 (0) 788 838 601
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
            Made with <Heart className="h-4 w-4 text-red-500" /> by PiGenovo Team © {currentYear}
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
