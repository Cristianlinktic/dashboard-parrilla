'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

import { ContentItem, HOURS, PLATFORMS, PlatformId } from '../../data/mockData';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formId, setFormId] = useState('');
  const [formHour, setFormHour] = useState('07');
  const [formMinute, setFormMinute] = useState('00');
  const [formDuration, setFormDuration] = useState<number>(10);
  const [formPlatform, setFormPlatform] = useState<PlatformId>('facebook');
  const [formType, setFormType] = useState<'post' | 'reel' | 'Story' | 'Trino' | 'Trino + imagen' | 'entrecomillados' | 'Espacio reservado'>('post');
  const [formStatus, setFormStatus] = useState<'Publicado' | 'No Publicado' | 'Programado' | 'Rechazado' | 'Por crear contenido' | 'Paso a CNE'>('Programado');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formComments, setFormComments] = useState('');
  const [formKpi, setFormKpi] = useState('');
  const [viewItem, setViewItem] = useState<ContentItem | null>(null);

  // Dragging states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartTime, setDragStartTime] = useState<string>('07:00');
  const [hasMoved, setHasMoved] = useState(false);

  // Viewer comment states
  const [viewerCommentName, setViewerCommentName] = useState('');
  const [viewerCommentText, setViewerCommentText] = useState('');
  
  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => setCurrentTime(new Date()), 30000);

    // Load theme
    const savedTheme = localStorage.getItem('dashboard_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Load session
    const sessionStr = localStorage.getItem('dashboard_session');
    if (!sessionStr) {
      router.replace('/');
      clearInterval(timer);
      return;
    }
    try {
      const session = JSON.parse(sessionStr);
      setRole(session.role);
    } catch (e) {
      router.replace('/');
      clearInterval(timer);
      return;
    }

    const loadContent = async () => {
      try {
        const { data, error } = await supabase.from('dashboard_content').select('*');
        if (error) throw error;
        
        if (data && data.length) {
          const defaultRow = data.find(r => r.id === 'default');
          const individualItems = data.filter(r => r.id !== 'default').map(r => r.content as ContentItem);

          // If individual items exist AND a default row exists, we MUST clear/ignore the default row
          // because it's likely a stale leftover from an old session.
          if (defaultRow && individualItems.length > 0) {
            console.log('Detected stale legacy row. Cleaning up...');
            await supabase.from('dashboard_content').delete().eq('id', 'default');
            setContentList(individualItems);
            localStorage.setItem('dashboard_content_list', JSON.stringify(individualItems));
          } else if (defaultRow && Array.isArray(defaultRow.content)) {
            // MIGRATION: Only runs if no individual items exist yet
            console.log('Migrating legacy data to new multi-row structure...');
            const legacyItems = defaultRow.content as ContentItem[];
            for (const item of legacyItems) {
              await supabase.from('dashboard_content').upsert({ id: item.id, content: item });
            }
            await supabase.from('dashboard_content').delete().eq('id', 'default');
            
            // Re-fetch to confirm
            const { data: migratedData } = await supabase.from('dashboard_content').select('*');
            const items = (migratedData || []).filter(r => r.id !== 'default').map(r => r.content as ContentItem);
            setContentList(items);
            localStorage.setItem('dashboard_content_list', JSON.stringify(items));
          } else {
            // Normal operation
            setContentList(individualItems);
            localStorage.setItem('dashboard_content_list', JSON.stringify(individualItems));
          }
        } else {
          // Table completely empty
          setContentList([]);
          localStorage.removeItem('dashboard_content_list');
        }
      } catch (e) {
        console.error('Error in loadContent:', e);
        const saved = localStorage.getItem('dashboard_content_list');
        if (saved) setContentList(JSON.parse(saved));
      }
    };

    loadContent();

    // Setup Realtime subscription - Listen to ALL changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_content'
        },
        (payload) => {
          console.log('Change received:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newItem = (payload.new as any).content as ContentItem;
            if (!newItem) return;
            setContentList(prev => {
              const idx = prev.findIndex(i => i.id === newItem.id);
              let updated;
              if (idx > -1) {
                updated = [...prev];
                updated[idx] = newItem;
              } else {
                updated = [...prev, newItem];
              }
              localStorage.setItem('dashboard_content_list', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            if (deletedId === 'default') {
              // Someone might still be writing to default, let's trigger a re-fetch
              loadContent();
              return;
            }
            setContentList(prev => {
              const updated = prev.filter(item => item.id !== deletedId);
              localStorage.setItem('dashboard_content_list', JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!draggingId || role !== 'editor') return;

    const onMouseMove = (e: MouseEvent) => {
      setHasMoved(true);
      const deltaY = e.clientY - dragStartY;
      const deltaMinutes = Math.round(deltaY / 3); // 180px/60min = 3px/min

      const [h, m] = dragStartTime.split(':').map(Number);
      let totalMinutes = h * 60 + m + deltaMinutes;

      // Restricciones de horario según mockData.ts (07:00 - 22:59 aprox)
      totalMinutes = Math.max(7 * 60, Math.min(22 * 60 + 59, totalMinutes));

      // Snap a cada 5 minutos para que sea más fácil de ubicar
      totalMinutes = Math.round(totalMinutes / 5) * 5;

      const newH = Math.floor(totalMinutes / 60);
      const newM = totalMinutes % 60;
      const newTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;

      setContentList(prev => prev.map(item =>
        item.id === draggingId ? { ...item, time: newTime } : item
      ));
    };

    const onMouseUp = async () => {
      setDraggingId(null);
      // Persistir el cambio final
      const currentListValue = JSON.parse(localStorage.getItem('dashboard_content_list') || '[]');
      // Nota: we use the functional update 'prev' in contentList, but here we can just use the state
      // because it's been updated by onMouseMove. However, setContentList is async.
      // To be safe, we can use the current contentList state if we're sure it's updated.
      // Since it's in the dependency array, it should be fine.
      localStorage.setItem('dashboard_content_list', JSON.stringify(contentList));
      try {
        await supabase.from('dashboard_content').upsert({ id: 'default', content: contentList });
      } catch (e) {
        console.error('Error auto-saving after drag:', e);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingId, dragStartY, dragStartTime, contentList, role]);

  const handleLogout = () => {
    localStorage.removeItem('dashboard_session');
    router.push('/');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('dashboard_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleOpenAddModal = (time: string, platform: PlatformId) => {
    if (role !== 'editor') return;
    setFormId('');
    const [h, m] = time.split(':');
    setFormHour(h || '07');
    setFormMinute(m || '00');
    setFormDuration(10);
    setFormPlatform(platform);
    setFormType('post');
    setFormStatus('Programado');
    setFormDescription('');
    setFormUrl('');
    setFormComments('');
    setFormKpi('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ContentItem) => {
    if (role !== 'editor') return;
    setFormId(item.id);
    const [h, m] = item.time.split(':');
    setFormHour(h || '07');
    setFormMinute(m || '00');
    setFormDuration(item.duration || 60);
    setFormPlatform(item.platform);
    setFormType(item.type);
    setFormStatus(item.status as any);
    setFormDescription(item.description);
    setFormUrl(item.url || '');
    setFormComments(item.comments || '');
    setFormKpi(item.kpi || '');
    setIsModalOpen(true);
  };

  const handleDragStart = (e: React.MouseEvent, item: ContentItem) => {
    if (role !== 'editor') return;
    // Solo arrastrar con click izquierdo
    if (e.button !== 0) return;

    // Evitar que el drag empiece si hacemos click en botones de acción
    if ((e.target as HTMLElement).closest('button')) return;

    setDraggingId(item.id);
    setDragStartY(e.clientY);
    setDragStartTime(item.time);
    setHasMoved(false);
  };

  const handleDeleteItem = async () => {
    if (role !== 'editor' || !itemToDelete) return;
    
    setIsSaving(true);
    setIsModalOpen(false); // Close modal if open
    
    try {
      const { error } = await supabase.from('dashboard_content').delete().eq('id', itemToDelete);
      if (error) throw error;
      
      console.log(`Item ${itemToDelete} deleted from DB.`);

      // Update local state and cache immediately
      setContentList(prev => {
        const updated = prev.filter(item => item.id !== itemToDelete);
        localStorage.setItem('dashboard_content_list', JSON.stringify(updated));
        return updated;
      });
      setItemToDelete(null);
    } catch (e: any) {
      console.error('Supabase delete error:', e);
      alert('Error al eliminar en la nube: ' + (e.message || 'Error desconocido'));
      setErrorMsg(e.message || 'Error al eliminar en la nube.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddViewerComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewItem) return;
    if (!viewerCommentName.trim() || !viewerCommentText.trim()) {
      alert('Por favor, ingresa tu nombre y un comentario.');
      return;
    }

    const now = new Date();
    const timestamp = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

    const newComment = {
      id: Date.now().toString(),
      name: viewerCommentName,
      comment: viewerCommentText,
      timestamp: timestamp
    };

    setIsSaving(true);
    try {
      const updatedItem = {
        ...viewItem,
        viewerComments: [...(viewItem.viewerComments || []), newComment]
      };

      const { error } = await supabase.from('dashboard_content').upsert({ id: viewItem.id, content: updatedItem });
      if (error) throw error;

      // Update local UI
      setViewItem(updatedItem);
      setContentList(prev => prev.map(item => item.id === viewItem.id ? updatedItem : item));

      // Clear form
      setViewerCommentName('');
      setViewerCommentText('');
    } catch (e: any) {
      console.error('Error saving viewer comment:', e);
      setErrorMsg(e.message || 'Error al guardar comentario.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent, forceNew: boolean = false) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      alert('Por favor, escribe el texto o descripción del contenido.');
      return;
    }

    const currentFormId = forceNew ? '' : formId;
    const timeStr = `${formHour}:${formMinute}`;

    const newItem: ContentItem = {
      id: currentFormId || Date.now().toString(),
      time: timeStr,
      platform: formPlatform,
      type: formType,
      status: formStatus,
      description: formDescription,
      duration: Number(formDuration),
      url: formUrl,
      comments: formComments,
      kpi: formKpi
    };

    setIsSaving(true);
    try {
      const { error } = await supabase.from('dashboard_content').upsert({ id: newItem.id, content: newItem });
      if (error) throw error;
      
      // Update local state and cache
      setContentList(prev => {
        const index = prev.findIndex(item => item.id === newItem.id);
        let updated;
        if (index > -1) {
          updated = [...prev];
          updated[index] = newItem;
        } else {
          updated = [...prev, newItem];
        }
        localStorage.setItem('dashboard_content_list', JSON.stringify(updated));
        return updated;
      });

      setIsModalOpen(false);
    } catch (e: any) {
      console.error('Supabase save error:', e);
      setErrorMsg(e.message || 'Error al guardar en la nube.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted) {
    return null; // Prevents hydration layout jumps
  }

  return (
    <div className={styles.dashboardContainer}>
      {isSaving && <div className={styles.savingOverlay}>Guardando...</div>}
      {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.logoGroup}>
            <img src="/icono-cne-partido-nx.svg" alt="Logo CNE" className={styles.logo} />
            <img src="/logo-actores-nx.svg" alt="Logo Actores" className={styles.logo} />
          </div>
          <div className={styles.textContainer}>
            <h1 className={`${styles.eventTitle} ${styles.platformName}`}>ContentPanel</h1>
            <h3 className={styles.eventSubtitle}>Evento de la Misión de Observación Internacional</h3>
          </div>
        </div>

        <div className={styles.headerActions}>
          {role === 'editor' ? (
            <span className={`${styles.roleBadge} ${styles.roleEditor}`}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
              Modo Editor ✍️
            </span>
          ) : (
            <span className={`${styles.roleBadge} ${styles.roleViewer}`}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#94a3b8' }} />
              Modo Visualizador 👁️
            </span>
          )}

          <button onClick={toggleTheme} className={styles.logoutBtn} title="Cambiar Tema">
            {theme === 'light' ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            )}
          </button>

          <button onClick={handleLogout} className={styles.logoutBtn} title="Salir">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Salir
          </button>
        </div>
      </header>

      {/* Main Dashboard Section */}
      <main className={styles.mainContent}>
        {/* Helper Banner depending on permissions */}
        {role === 'editor' ? (
          <div className={styles.infoBanner}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708.286a.75.75 0 01-1.063-.852l.708-.286zm0 0L10.5 12.75M12 20.25a8.25 8.25 0 100-16.5 8.25 8.25 0 000 16.5z" />
            </svg>
            <span><strong>Modo Editor Activo:</strong> Puedes hacer clic sobre cualquier celda vacía para programar contenido, o editar/eliminar las publicaciones existentes de la grilla.</span>
          </div>
        ) : (
          <div className={`${styles.infoBanner} ${styles.infoBannerViewer}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span><strong>Modo de Solo Lectura:</strong> Tienes acceso a visualizar toda la planificación del evento, pero no puedes añadir ni modificar publicaciones. Para realizar cambios, ingresa como Editor.</span>
          </div>
        )}

        {/* Content Parrilla Grid */}
        <div className={styles.gridWrapper}>
          <div className={styles.grid}>

            {/* Header Columns */}
            <div className={styles.gridHeader}>
              <div className={`${styles.gridHeaderCell} ${styles.gridHeaderCellTime}`}>Hora</div>
              {PLATFORMS.map(plat => {
                let headerClass = '';
                if (plat.id === 'facebook') headerClass = styles.headerFb;
                else if (plat.id === 'instagram') headerClass = styles.headerIg;
                else if (plat.id === 'tiktok') headerClass = styles.headerTt;
                else if (plat.id === 'x') headerClass = styles.headerX;

                return (
                  <div key={plat.id} className={`${styles.gridHeaderCell} ${headerClass}`}>
                    {plat.id === 'facebook' && (
                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    )}
                    {plat.id === 'instagram' && (
                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    )}
                    {plat.id === 'tiktok' && (
                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.22-.4-.45-.58-.7v5.13c.05 3.07-1.41 6.03-4.14 7.36-2.83 1.43-6.52 1.05-8.93-1.07-2.45-2.14-3.28-5.74-2.02-8.77C3.99 7.48 7.34 5.3 10.72 5.7c.2.02.4.06.6.1v4.09c-.89-.26-1.89-.2-2.7.25-.95.53-1.52 1.57-1.54 2.66-.02 1.55 1.25 2.91 2.8 2.91 1.49-.03 2.72-1.22 2.78-2.71.02-3.14.01-6.28.01-9.42-.01-.18-.09-.34-.15-.5z" />
                      </svg>
                    )}
                    {plat.id === 'x' && (
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    )}
                    {plat.name}
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            {HOURS.map(hour => {
              // Calculate if this hour row is active
              let isActive = false;
              let progressPercent = 0;

              if (currentTime) {
                const currentH = currentTime.getHours();
                const currentM = currentTime.getMinutes();
                const rowH = parseInt(hour.split(':')[0], 10);

                isActive = currentH === rowH;
                progressPercent = (currentM / 60) * 100;
              }

              return (
                <div key={hour} className={styles.gridRow}>
                  {/* Time Indicator Cell */}
                  <div className={`${styles.timeCell} ${isActive ? styles.timeCellActive : ''}`}>
                    <div className={styles.timeIntervalsContainer}>
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(min => {
                        const isMainHour = min === 0;
                        return (
                          <div key={min} className={isMainHour ? styles.timeMainHour : styles.timeMinute}>
                            {hour.split(':')[0]}:{min.toString().padStart(2, '0')}
                          </div>
                        );
                      })}
                    </div>

                    {isActive && (
                      <>
                        <div className={styles.indicatorLine} style={{ top: `${progressPercent}%` }} />
                        <div className={styles.indicatorDot} style={{ top: `calc(${progressPercent}% - 4px)` }} />
                      </>
                    )}
                  </div>

                  {/* Platform columns cells for this hour */}
                  {PLATFORMS.map(plat => {
                    const cellItems = contentList.filter(item => {
                      const [itemH] = item.time.split(':');
                      const [rowH] = hour.split(':');
                      return itemH === rowH && item.platform === plat.id;
                    });

                    return (
                      <div
                        key={`${hour}-${plat.id}`}
                        className={`${styles.gridCell} ${isActive ? styles.gridCellActive : ''}`}
                        onClick={() => role === 'editor' && handleOpenAddModal(hour, plat.id)}
                      >
                        {isActive && (
                          <div className={styles.indicatorLine} style={{ top: `${progressPercent}%` }} />
                        )}

                        {role === 'editor' && (
                          <button
                            className={styles.cellAddBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddModal(hour, plat.id);
                            }}
                            title="Añadir otro contenido a esta hora"
                          >
                            +
                          </button>
                        )}

                        {cellItems.map((cellItem, index) => {
                          const startMin = parseInt(cellItem.time.split(':')[1], 10) || 0;
                          const topPercent = (startMin / 60) * 100;
                          const heightPercent = ((cellItem.duration || 60) / 60) * 100;
                          const isShort = (cellItem.duration || 60) <= 30;

                          return (
                            /* Publication Card */
                            <div
                              key={cellItem.id}
                              className={`${styles.card} ${isShort ? styles.cardShort : ''} glass ${plat.id === 'facebook' ? styles.cardFb :
                                plat.id === 'instagram' ? styles.cardIg :
                                  plat.id === 'tiktok' ? styles.cardTt : styles.cardX
                                } ${role === 'editor' ? styles.cardEditor : ''} ${draggingId === cellItem.id ? styles.cardDragging : ''}`}
                              style={{
                                top: `${topPercent}%`,
                                height: `${heightPercent}%`,
                                left: `${(index / cellItems.length) * 100}%`,
                                width: `${100 / cellItems.length}%`,
                                padding: cellItems.length > 1 ? '6px 4px' : '10px 12px',
                                zIndex: 10 + index,
                              }}
                              onMouseDown={(e) => handleDragStart(e, cellItem)}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasMoved) return; // Si se movió (drag), no abrir modal

                                if (role === 'editor') {
                                  handleOpenEditModal(cellItem);
                                } else {
                                  setViewItem(cellItem);
                                }
                              }}
                            >
                              <div className={styles.cardHeader}>
                                <div className={styles.badgeGroup}>
                                  <span className={`${styles.badge} ${cellItem.type === 'post' ? styles.badgePost :
                                    cellItem.type === 'reel' ? styles.badgeReel :
                                      cellItem.type === 'Story' ? styles.badgeStory :
                                        cellItem.type === 'Trino' ? styles.badgeTrino :
                                          cellItem.type === 'Trino + imagen' ? styles.badgeTrinoImg :
                                            cellItem.type === 'Espacio reservado' ? styles.badgeEspacio :
                                              styles.badgeQuoted
                                    }`}>
                                    {cellItem.type}
                                  </span>
                                </div>

                                <span className={`${styles.statusBadge} ${cellItem.status === 'Publicado' ? styles.statusPublicado :
                                  cellItem.status === 'Programado' ? styles.statusProgramado :
                                    cellItem.status === 'Rechazado' ? styles.statusRechazado :
                                      cellItem.status === 'Por crear contenido' ? styles.statusPorCrear :
                                        cellItem.status === 'Paso a CNE' ? styles.statusCne :
                                          styles.statusNoPublicado
                                  }`}>
                                  {cellItem.time} - {cellItem.status}
                                </span>
                              </div>

                              <p className={styles.cardBody} title={cellItem.description}>
                                <br />
                                {cellItem.description}
                                {cellItem.url && (
                                  <a href={cellItem.url} target="_blank" rel="noopener noreferrer" className={styles.cardUrlIcon} title={cellItem.url} onClick={(e) => e.stopPropagation()}>
                                    <br />{cellItem.url}</a>
                                )}
                              </p>

                              {/* Card Editor Actions */}
                              {role === 'editor' && (
                                <div className={styles.cardFooter}>
                                  <button
                                    className={`${styles.actionBtn} styles.actionBtnEdit`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(cellItem);
                                    }}
                                    title="Editar publicación"
                                  >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                  </button>
                                  <button
                                    className={`${styles.actionBtn} styles.actionBtnDelete`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItemToDelete(cellItem.id);
                                    }}
                                    title="Eliminar publicación"
                                  >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Empty cell indicator (Always show if Editor to allow multiple) */}
                        {role === 'editor' && (
                          <div className={styles.addPlaceholder} style={{ zIndex: 1 }}>
                            <span className={styles.addPlaceholderIcon}>+</span>
                            <span className={styles.addPlaceholderText}>Agregar</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

          </div>
        </div>
      </main>


      {/* Save / Edit Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {formId ? 'Contenido' : 'Agregar a Parrilla'}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className={styles.modalBody}>

                <div className={styles.formGrid}>
                  {/* Hour and Minute fields */}
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Hora Publicación</label>
                    <select
                      className={styles.modalInput}
                      value={formHour}
                      onChange={(e) => setFormHour(e.target.value)}
                    >
                      {HOURS.map(h => {
                        const hr = h.split(':')[0];
                        return <option key={hr} value={hr}>{hr}:</option>;
                      })}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Minuto Publicación</label>
                    <select
                      className={styles.modalInput}
                      value={formMinute}
                      onChange={(e) => setFormMinute(e.target.value)}
                    >
                      <option value="00">00</option>
                      <option value="05">05</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="20">20</option>
                      <option value="25">25</option>
                      <option value="30">30</option>
                      <option value="35">35</option>
                      <option value="40">40</option>
                      <option value="45">45</option>
                      <option value="50">50</option>
                      <option value="55">55</option>
                    </select>
                  </div>

                  {/* Duration field */}
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Duración</label>
                    <select
                      className={styles.modalInput}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                    >
                      <option value={10}>10 minutos</option>
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>60 minutos (1 hora)</option>
                    </select>
                  </div>

                  {/* Platform field */}
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Publicar en</label>
                    <select
                      className={styles.modalInput}
                      value={formPlatform}
                      onChange={(e) => setFormPlatform(e.target.value as PlatformId)}
                    >
                      {PLATFORMS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Content Type field */}
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Tipo de Contenido</label>
                    <select
                      className={styles.modalInput}
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                    >
                      <option value="post">Post</option>
                      <option value="reel">Reel</option>
                      <option value="Story">Story</option>
                      <option value="Trino">Trino</option>
                      <option value="Trino + imagen">Trino + imagen</option>
                      <option value="entrecomillados">entrecomillados</option>
                      <option value="Espacio reservado">Espacio reservado</option>
                    </select>
                  </div>

                  {/* Status field */}
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Estado</label>
                    <select
                      className={styles.modalInput}
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'Publicado' | 'No Publicado' | 'Programado' | 'Rechazado' | 'Por crear contenido')}
                    >
                      <option value="Publicado">Publicado</option>
                      <option value="No Publicado">No Publicado</option>
                      <option value="Programado">Programado</option>
                      <option value="Rechazado">Rechazado</option>
                      <option value="Por crear contenido">Por crear contenido</option>
                      <option value="Paso a CNE">Paso a CNE</option>
                    </select>
                  </div>

                  {/* KPI Field */}
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.fieldLabel}>KPI objetivo</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      placeholder="Ej: 1000 likes, 500 clics..."
                      value={formKpi}
                      onChange={(e) => setFormKpi(e.target.value)}
                    />
                  </div>

                  {/* Content Textarea */}
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.fieldLabel}>Copy del contenido</label>
                    <textarea
                      className={styles.modalTextarea}
                      placeholder="Escribe aquí el copy de la publicación, hashtags o instrucciones técnicas..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  {/* URL Field */}
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.fieldLabel}>Link de piezas</label>
                    <input
                      type="url"
                      className={styles.modalInput}
                      placeholder="https://..."
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                    />
                  </div>

                  {/* Comments Field */}
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.fieldLabel}>Comentarios de publicadores</label>
                    <textarea
                      className={styles.modalTextarea}
                      style={{ minHeight: '80px' }}
                      placeholder="Escribe aquí los comentarios..."
                      value={formComments}
                      onChange={(e) => setFormComments(e.target.value)}
                    />
                  </div>

                </div>

              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                {formId && (
                  <button
                    type="button"
                    className={styles.btnSaveNew}
                    onClick={(e) => {
                      handleSaveItem(e, true);
                    }}
                    title="Crea una copia de este contenido en lugar de editar el original"
                  >
                    Guardar como nuevo
                  </button>
                )}
                <button type="submit" className={styles.btnSave}>
                  {formId ? 'Guardar Cambios' : 'Guardar en Parrilla'}
                </button>
                {formId && (
                  <button
                    type="button"
                    className={styles.modalDeleteBtn}
                    onClick={() => setItemToDelete(formId)}
                    title="Eliminar esta publicación"
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}


      {/* View Modal for Viewer Mode */}
      {viewItem && (
        <div className={styles.modalOverlay} onClick={() => setViewItem(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Contenido</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setViewItem(null)}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>Red Social</span>
                  <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>{viewItem.platform}</span>
                </div>
                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>Hora</span>
                  <span className={styles.infoValue}>{viewItem.time}</span>
                </div>
                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>Tipo</span>
                  <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>{viewItem.type}</span>
                </div>
                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>Estado</span>
                  <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>{viewItem.status}</span>
                </div>
                {viewItem.url && (
                  <div className={`${styles.infoBox} ${styles.infoBoxFull}`}>
                    <span className={styles.infoLabel}>Link de piezas</span>
                    <a href={viewItem.url} target="_blank" rel="noopener noreferrer" className={styles.infoValue} style={{ color: 'var(--col-blue)', textDecoration: 'underline' }}>{viewItem.url}</a>
                  </div>
                )}
                {viewItem.kpi && (
                  <div className={`${styles.infoBox} ${styles.infoBoxFull}`}>
                    <span className={styles.infoLabel}>KPI objetivo</span>
                    <span className={styles.infoValue}>{viewItem.kpi}</span>
                  </div>
                )}
                <div className={`${styles.infoBox} ${styles.infoBoxFull}`} style={{ backgroundColor: 'rgba(248,250,252,0.5)' }}>
                  <span className={styles.infoLabel}>Copy del contenido</span>
                  <span className={styles.infoValue} style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{viewItem.description}</span>
                </div>
                {viewItem.comments && (
                  <div className={`${styles.infoBox} ${styles.infoBoxFull}`} style={{ backgroundColor: 'rgba(254,243,199,0.3)' }}>
                    <span className={styles.infoLabel}>Comentarios de publicadores</span>
                    <span className={styles.infoValue} style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{viewItem.comments}</span>
                  </div>
                )}

                {/* Seccion de Comentarios de Visualizadores */}
                <div className={styles.commentsSection}>
                  <h3 className={styles.commentsTitle}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Comentarios y Observaciones
                  </h3>

                  <div className={styles.commentList}>
                    {(!viewItem.viewerComments || viewItem.viewerComments.length === 0) ? (
                      <p className={styles.noComments}>No hay comentarios aún. ¡Sé el primero en opinar!</p>
                    ) : (
                      viewItem.viewerComments.map(c => (
                        <div key={c.id} className={styles.commentItem}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentUser}>{c.name}</span>
                            <span className={styles.commentTime}>{c.timestamp}</span>
                          </div>
                          <p className={styles.commentText}>{c.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Formulario para agregar comentario */}
                  <form onSubmit={handleAddViewerComment} className={styles.addCommentForm}>
                    <div className={styles.commentInputGroup}>
                      <label className={styles.fieldLabel}>Tu Nombre</label>
                      <input
                        type="text"
                        className={styles.modalInput}
                        placeholder="Quien comenta..."
                        value={viewerCommentName}
                        onChange={(e) => setViewerCommentName(e.target.value)}
                      />
                    </div>
                    <div className={styles.commentInputGroup}>
                      <label className={styles.fieldLabel}>Observación o Comentario</label>
                      <textarea
                        className={styles.modalInput}
                        style={{ minHeight: '60px', resize: 'vertical' }}
                        placeholder="Escribe aquí tu observación..."
                        value={viewerCommentText}
                        onChange={(e) => setViewerCommentText(e.target.value)}
                      />
                    </div>
                    <button type="submit" className={styles.btnSubmitComment}>
                      Enviar Comentario
                    </button>
                  </form>
                </div>

              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => setViewItem(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
          <div className={`${styles.modal} ${styles.modalSmall}`}>
            <div className={styles.modalHeader} style={{ background: 'var(--col-red-light)', borderBottomColor: 'var(--col-red)' }}>
              <h2 className={styles.modalTitle} style={{ color: 'var(--col-red)' }}>Confirmar eliminación</h2>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '16px', textAlign: 'center', margin: '20px 0', lineHeight: '1.6' }}>
                ¿Estás seguro de que deseas eliminar esta publicación? <br />
                <strong>Esta acción no se puede deshacer y afectará a todos los usuarios.</strong>
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => setItemToDelete(null)}
              >
                No, cancelar
              </button>
              <button
                type="button"
                className={styles.btnSave}
                style={{ background: 'var(--col-red)', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)' }}
                onClick={handleDeleteItem}
              >
                Sí, eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
