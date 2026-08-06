import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, User, LogOut, LayoutDashboard, Bell, Shield, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUnreadCount, subscribeToNotifications } from '@/services/notificationService';
import { getFavorites } from '@/services/favoriteService';

const NAV_LINKS = [
  { to: '/properties', label: 'Comprar' },
  { to: '/properties?transaction_type=rent', label: 'Arrendar' },
  { to: '/properties/new', label: 'Publicar imóvel' },
];

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0); setFavoriteCount(0); return;
    }
    let active = true;
    getUnreadCount(user.id).then((n) => { if (active) setUnreadCount(n); }).catch(() => {});
    getFavorites(user.id).then((items) => { if (active) setFavoriteCount(items.length); }).catch(() => {});
    const channel = subscribeToNotifications(user.id, () => {
      getUnreadCount(user.id).then((n) => { if (active) setUnreadCount(n); }).catch(() => {});
    });
    return () => { active = false; channel.unsubscribe(); };
  }, [user]);

  const isHome = location.pathname === '/';
  const transparent = isHome && !scrolled;
  const text = transparent ? 'text-white' : 'text-foreground';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${transparent ? 'bg-transparent' : 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border/70'}`}>
      <div className="container-mw container-px">
        <div className="flex h-16 items-center justify-between lg:h-20">
          <Link to="/" className={`font-serif text-xl font-bold tracking-tight lg:text-2xl ${text}`}>KUBATA KIÉ</Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className={`nav-link ${transparent ? 'text-white/90 hover:text-white' : ''}`}>
                {link.label}
              </Link>
            ))}
            <Link to="/sobre" className={`nav-link ${transparent ? 'text-white/90 hover:text-white' : ''}`}>Sobre</Link>
          </nav>

          <div className="flex items-center gap-1 lg:gap-2">
            {user && (
              <>
                <Link to="/notifications" aria-label="Notificações" className={`relative rounded-full p-2 hover:bg-white/10 ${text}`}>
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </Link>
                <Link to="/favorites" aria-label="Favoritos" className={`relative rounded-full p-2 hover:bg-white/10 ${text}`}>
                  <Heart className="h-5 w-5" />
                  {favoriteCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">{favoriteCount}</span>}
                </Link>
                <Link to="/dashboard" aria-label="Painel" className={`rounded-full p-2 hover:bg-white/10 ${text}`}><User className="h-5 w-5" /></Link>
                {profile?.role === 'admin' && <Link to="/admin" aria-label="Admin" className={`rounded-full p-2 hover:bg-white/10 ${text}`}><Shield className="h-5 w-5" /></Link>}
                <button onClick={handleSignOut} aria-label="Sair" className={`hidden rounded-full p-2 hover:bg-white/10 lg:block ${text}`}><LogOut className="h-5 w-5" /></button>
              </>
            )}
            {!user && <Link to="/signin" className={`hidden rounded-sm border px-4 py-2 text-sm font-medium lg:block ${transparent ? 'border-white/40 text-white' : 'border-border text-foreground'}`}>Entrar</Link>}
            <button onClick={() => setMobileOpen((v) => !v)} className={`rounded-full p-2 lg:hidden ${text}`} aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border/60 bg-background py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => <Link key={link.to} to={link.to} className="rounded px-3 py-3 text-sm font-medium hover:bg-muted">{link.label}</Link>)}
              <Link to="/sobre" className="rounded px-3 py-3 text-sm font-medium hover:bg-muted">Sobre</Link>
              {user ? <><Link to="/dashboard" className="rounded px-3 py-3 text-sm font-medium hover:bg-muted">Painel</Link>{profile?.role === 'admin' && <Link to="/admin" className="rounded px-3 py-3 text-sm font-medium hover:bg-muted">Administrador</Link>}<button onClick={handleSignOut} className="flex items-center gap-2 rounded px-3 py-3 text-left text-sm font-medium hover:bg-muted"><LogOut className="h-4 w-4" /> Sair</button></> : <Link to="/signin" className="rounded px-3 py-3 text-sm font-medium hover:bg-muted">Entrar</Link>}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
