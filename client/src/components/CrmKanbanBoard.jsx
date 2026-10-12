import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUpRight, CalendarDays, Grip, MessageCircle } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

const columns = [
  { id: 'new_lead', title: 'Lead mới', color: 'mint' },
  { id: 'consulting', title: 'Đang tư vấn', color: 'blue' },
  { id: 'quoted', title: 'Đã báo giá', color: 'lavender' },
  { id: 'closed_won', title: 'Đã chốt', color: 'yellow' },
  { id: 'in_progress', title: 'Đang thực hiện', color: 'peach' },
  { id: 'completed', title: 'Hoàn thành', color: 'green' },
];

const demoLeads = [
  { id: 'l1', customer: 'Minh Anh', event: 'Lễ cưới tại Sơn Trà', date: '12 Thg 11', category: 'Quay phim', budget: '8–12 triệu', status: 'new_lead', initials: 'MA', avatarClass: 'avatar-peach' },
  { id: 'l2', customer: 'Hoàng Nam', event: 'Year End Party 2025', date: '18 Thg 12', category: 'Ban nhạc', budget: '15 triệu', status: 'consulting', initials: 'HN', avatarClass: 'avatar-blue' },
  { id: 'l3', customer: 'Lan Phương', event: 'Tiệc sinh nhật ngoài trời', date: '04 Thg 01', category: 'Trang trí', budget: '6–9 triệu', status: 'quoted', initials: 'LP', avatarClass: 'avatar-lilac' },
  { id: 'l4', customer: 'Gia Bảo', event: 'Kỷ niệm ngày cưới', date: '22 Thg 01', category: 'Chụp ảnh', budget: '5 triệu', status: 'in_progress', initials: 'GB', avatarClass: 'avatar-green' },
];

function LeadCard({ lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`lead-card ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
    >
      <div className="lead-card-top">
        <span className="lead-category">{lead.category}</span>
        <button className="drag-handle" type="button" aria-label={`Kéo lead của ${lead.customer}`} {...listeners}>
          <Grip size={16} />
        </button>
      </div>
      <h4>{lead.event}</h4>
      <div className="lead-customer">
        <span className={`mini-avatar ${lead.avatarClass}`}>{lead.initials}</span>
        <span>{lead.customer}</span>
      </div>
      <div className="lead-meta">
        <span><CalendarDays size={13} /> {lead.date}</span>
        <span>{lead.budget}</span>
      </div>
      <button className="lead-chat" type="button">
        <MessageCircle size={14} /> Mở hội thoại <ArrowUpRight size={13} />
      </button>
    </article>
  );
}

function KanbanColumn({ column, leads }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section ref={setNodeRef} className={`kanban-column ${isOver ? 'is-over' : ''}`}>
      <header className="kanban-column-header">
        <span className={`column-dot dot-${column.color}`} />
        <h3>{column.title}</h3>
        <span className="column-count">{leads.length}</span>
      </header>
      <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
        <div className="lead-list">
          {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          {leads.length === 0 && <div className="drop-hint">Thả lead vào đây</div>}
        </div>
      </SortableContext>
    </section>
  );
}

export default function CrmKanbanBoard({ initialLeads = demoLeads, token = localStorage.getItem('bridgc_token'), onStatusChange }) {
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd({ active, over }) {
    if (!over) return;
    const moved = leads.find((lead) => lead.id === active.id);
    const nextStatus = columns.some((column) => column.id === over.id)
      ? over.id
      : leads.find((lead) => lead.id === over.id)?.status;
    if (!moved || !nextStatus || moved.status === nextStatus) return;

    const previous = leads;
    setError('');
    setLeads((current) => current.map((lead) => lead.id === moved.id ? { ...lead, status: nextStatus } : lead));
    try {
      if (onStatusChange) await onStatusChange(moved, nextStatus);
      else if (!moved.id.startsWith('l')) {
        await apiRequest(`/api/crm/leads/${moved.id}/status`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ status: nextStatus }),
        });
      }
    } catch (requestError) {
      setLeads(previous);
      setError(requestError.message);
    }
  }

  return (
    <div className="crm-board-shell">
      <div className="crm-board-heading">
        <div>
          <span className="eyebrow">KHÔNG GIAN KINH DOANH</span>
          <h2>Pipeline khách hàng</h2>
          <p>Kéo thả lead để cập nhật tiến độ tư vấn.</p>
        </div>
        <button className="button button-outline" type="button">+ Thêm lead</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => (
            <KanbanColumn key={column.id} column={column} leads={leads.filter((lead) => lead.status === column.id)} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
