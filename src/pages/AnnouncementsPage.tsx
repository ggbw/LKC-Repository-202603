import React, { useState } from 'react';
import { useAnnouncements, useInvalidate } from '@/hooks/useSupabaseData';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, Badge, Btn, Modal, ModalHead, ModalBody, ModalFoot, Field, FieldInput, FieldSelect } from '@/components/SharedUI';
import { formatDate } from '@/data/database';

export default function AnnouncementsPage() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const { isAdmin, isTeacher } = useAuth();
  const { showToast } = useApp();
  const [modal, setModal] = useState(false);
  const invalidate = useInvalidate();

  if (isLoading) return <div className="page-animate"><div className="text-sm" style={{ color: 'hsl(var(--text2))' }}>Loading...</div></div>;

  return (
    <div className="page-animate">
      <div className="flex justify-between items-center mb-4">
        <div><div className="text-lg font-bold">Announcements & Events</div><div className="text-[11px]" style={{ color: 'hsl(var(--text2))' }}>{announcements.length} total</div></div>
        {(isAdmin || isTeacher) && <Btn onClick={() => setModal(true)}>＋ New Announcement</Btn>}
      </div>

      {announcements.length === 0 ? (
        <Card><div className="py-10 text-center text-xs" style={{ color: 'hsl(var(--text3))' }}>No announcements yet</div></Card>
      ) : (
        <div className="grid gap-3">
          {announcements.map((a: any) => (
            <Card key={a.id}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-sm">{a.title}</div>
                <Badge status={a.type || 'announcement'} />
              </div>
              <div className="text-[12.5px] mb-2" style={{ color: 'hsl(var(--text2))' }}>{a.content}</div>
              <div className="flex gap-3 text-[10px]" style={{ color: 'hsl(var(--text3))' }}>
                <span>📅 {formatDate(a.created_at)}</span>
                {a.event_date && <span>🎯 Event: {formatDate(a.event_date)}</span>}
              </div>
            </Card>
          ))}
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
