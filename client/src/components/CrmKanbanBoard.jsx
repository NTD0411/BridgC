import { useEffect, useState } from 'react';
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
import { CalendarDays, Grip } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

const columns = [
  { id: 'new_lead', title: 'Lead mới', color: 'mint' },
  { id: 'consulting', title: 'Đang tư vấn', color: 'blue' },
  { id: 'quoted', title: 'Đã báo giá', color: 'lavender' },
  { id: 'closed_won', title: 'Đã chốt', color: 'yellow' },
  { id: 'in_progress', title: 'Đang thực hiện', color: 'peach' },
  { id: 'completed', title: 'Hoàn thành', color: 'green' },
  { id: 'cancelled', title: 'Đã hủy', color: 'peach' },
];
const EMPTY_LEADS = [];

const formatLead = (lead) => {
  const customer = lead.customerId?.fullName || 'Khách hàng';
  const date = lead.rfpId?.eventDate
    ? new Date(lead.rfpId.eventDate).toLocaleDateString('vi-VN')
    : new Date(lead.createdAt).toLocaleDateString('vi-VN');
  const format = (value) => value == null ? '' : new Intl.NumberFormat('vi-VN').format(value);
  const budgetMin = lead.rfpId?.budgetMin;
  const budgetMax = lead.rfpId?.budgetMax;
  const budget = budgetMin == null && budgetMax == null
    ? 'Chưa nêu ngân sách'
    : `${budgetMin == null ? '' : format(budgetMin)}${budgetMin != null && budgetMax != null ? '–' : ''}${budgetMax == null ? '' : format(budgetMax)}đ`;
  return {
    id: String(lead._id),
    customer,
    event: lead.rfpId?.title || 'Yêu cầu trực tiếp',
    date,
    category: lead.rfpId?.category || lead.source,
    budget,
    status: lead.status,
    initials: customer.slice(0, 2).toLocaleUpperCase(),
  };
};

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
          {leads.length === 0 && <div className="drop-hint">Chưa có lead</div>}
        </div>
      </SortableContext>
    </section>
  );
}

export default function CrmKanbanBoard({ initialLeads = EMPTY_LEADS, token = localStorage.getItem('bridgc_token'), onStatusChange }) {
  const [leads, setLeads] = useState(initialLeads.map(formatLead));
  const [error, setError] = useState('');
  useEffect(() => setLeads(initialLeads.map(formatLead)), [initialLeads]);
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
      else {
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
