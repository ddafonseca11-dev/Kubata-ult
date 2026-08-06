import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/notificationService';
import type { Notification as AppNotification } from '@/types';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    getNotifications(user.id).then((notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });
  }, [user, navigate]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // Type guard for Notification type
  const notifs = notifications as AppNotification[];

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><div className="animate-pulse h-40 bg-slate-200 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
        {notifs.some((n) => !n.is_read) && (
          <button onClick={handleMarkAll} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium">
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>Não tens notificações.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-colors ${
                notif.is_read ? 'bg-white border-slate-200' : 'bg-teal-50 border-teal-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{notif.title}</div>
                  {notif.body && <div className="text-sm text-slate-600 mt-1">{notif.body}</div>}
                  <div className="text-xs text-slate-400 mt-2">{new Date(notif.created_at).toLocaleString('pt-PT')}</div>
                </div>
                {!notif.is_read && (
                  <button onClick={() => handleMarkRead(notif.id)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    Marcar como lida
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
