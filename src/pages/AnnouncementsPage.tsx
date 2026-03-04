import React, { useState, useMemo } from 'react';
import { useAnnouncements, useInvalidate } from '@/hooks/useSupabaseData';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, Badge, Btn, Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';
import { formatDate } from '@/data/database';
import { downloadExcel } from '@/lib/excel';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, format, isSameMonth, isSameDay, isBefore, startOfDay } from 'date-fns';

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const { isAdmin, isTeacher } = useAuth();
  const { showToast } = useApp();
  const [modal, setModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const invalidate = useInvalidate();
  const today = startOfDay(new Date());

  // Start with current month
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleExport = () => {
    downloadExcel(announcements.map((a: any) => ({
      'Title': a.title, 'Content': a.content || '', 'Type': a.type || '',
      'Created': a.created_at?.split('T')[0] || '', 'Event Date': a.event_date || '',
    })), 'announcements_export', 'Announcements');
    showToast('Exported');
  };

  // Group announcements by event_date (or created_at date)
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    announcements.forEach((a: any) => {
      const dateKey = a.event_date || a.created_at?.split('T')[0];
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(a);
    });
    return map;
  }, [announcements]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold"><i className="fas fa-bullhorn mr-2" />Announcements & Events</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{announcements.length} total</div></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={handleExport}><i className="fas fa-download mr-1" />Export</Btn>
          {(isAdmin || isTeacher) && <Btn onClick={() => setModal(true)}><i className="fas fa-plus mr-1" />New</Btn>}
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <Btn variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>◀</Btn>
          <div className="font-bold text-sm">{format(currentMonth, 'MMMM yyyy')}</div>
          <Btn variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>▶</Btn>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: 'hsl(var(--text3))' }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
          {calendarDays.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const events = eventsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isPast = isBefore(day, today);
            const isSelected = selectedDate === dateKey;

            return (
              <div
                key={i}
                onClick={() => events.length > 0 ? setSelectedDate(isSelected ? null : dateKey) : null}
                className="min-h-[72px] p-1 transition-all"
                style={{
                  background: isSelected ? 'hsl(var(--primary) / 0.08)' : isToday ? 'hsl(var(--accent) / 0.15)' : 'hsl(var(--surface))',
                  opacity: !isCurrentMonth ? 0.35 : 1,
                  cursor: events.length > 0 ? 'pointer' : 'default',
                }}
              >
                <div className={`text-[11px] font-medium mb-0.5 ${isToday ? 'font-bold' : ''}`}
                  style={{
                    color: isToday ? 'hsl(var(--primary))' : 'hsl(var(--text))',
                  }}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 2).map((ev: any, j: number) => (
                    <div key={j}
                      className="text-[9px] leading-tight px-1 py-0.5 rounded truncate transition-opacity"
                      style={{
                        background: ev.type === 'event' ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--accent) / 0.3)',
                        color: isPast ? 'hsl(var(--text3))' : 'hsl(var(--text))',
                        opacity: isPast ? 0.5 : 1,
                      }}>
                      {ev.title}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <div className="text-[9px] px-1" style={{ color: 'hsl(var(--text3))' }}>+{events.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected date detail panel */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="mt-3 grid gap-2">
          <div className="text-xs font-bold mb-1" style={{ color: 'hsl(var(--text2))' }}>
            📅 {formatDate(selectedDate)} — {selectedEvents.length} item{selectedEvents.length > 1 ? 's' : ''}
          </div>
          {selectedEvents.map((a: any) => {
            const isPast = isBefore(new Date(a.event_date || a.created_at), today);
            return (
              <Card key={a.id}>
                <div className="flex justify-between items-start mb-1" style={{ opacity: isPast ? 0.5 : 1 }}>
                  <div className="font-bold text-sm">{a.title}</div>
                  <div className="flex gap-2 items-center">
                    <Badge status={a.type || 'announcement'} />
                    {isAdmin && (
                      <Btn variant="danger" size="sm" onClick={async () => {
                        if (!confirm('Delete?')) return;
                        await supabase.from('announcements').delete().eq('id', a.id);
                        invalidate(['announcements']);
                        showToast('Deleted');
                      }}>🗑</Btn>
                    )}
                  </div>
                </div>
                <div className="text-[12.5px] mb-1" style={{ color: 'hsl(var(--text2))', opacity: isPast ? 0.5 : 1 }}>{a.content}</div>
              </Card>
            );
          })}
        </div>
      )}

      {modal && <AnnouncementModal onClose={() => { setModal(false); invalidate(['announcements']); }} />}
    </div>
  );
}

function AnnouncementModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('announcement');
  const [eventDate, setEventDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('announcements').insert({
      title, content, type, event_date: eventDate || null, created_by: user?.id,
    });
    if (error) { showToast(error.message, 'error'); setSaving(false); return; }
    showToast('Announcement created');
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHead title="📢 New Announcement" onClose={onClose} />
      <ModalBody>
        <Field label="Title" required><FieldInput value={title} onChange={setTitle} /></Field>
        <Field label="Content">
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
            className="w-full border rounded-md py-2 px-2.5 text-[12.5px] font-sans outline-none resize-y"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--surface2))', color: 'hsl(var(--text))' }} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><FieldSelect value={type} onChange={setType} options={[{ value: 'announcement', label: 'Announcement' }, { value: 'event', label: 'Event' }]} /></Field>
          <Field label="Event Date"><FieldInput value={eventDate} onChange={setEventDate} type="date" /></Field>
        </div>
      </ModalBody>
      <ModalFoot>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Btn>
      </ModalFoot>
    </Modal>
  );
}
