import type * as React from 'react';

type Children = { children?: React.ReactNode };
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'sample';
export type IconName = string; // a Phosphor Regular name bundled in this system

export declare function Icon(p: { name: IconName; size?: 16 | 20 | 24 | number; label?: string }): React.ReactElement;
export declare function Logo(p: { variant?: 'lockup' | 'frame'; height?: number; label?: string }): React.ReactElement;

export declare function Button(p: Children & React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive'; size?: 'sm' | 'md' | 'lg';
  icon?: IconName; iconAfter?: IconName; loading?: boolean; loadingLabel?: string; fullWidth?: boolean }): React.ReactElement;
export declare function IconButton(p: { icon: IconName; label: string; variant?: 'plain' | 'tonal' | 'outline'; badge?: boolean; disabled?: boolean; onClick?: () => void }): React.ReactElement;

export declare function TextField(p: { label: string; value?: string; placeholder?: string; helper?: string; error?: string; optional?: boolean;
  disabled?: boolean; icon?: IconName; type?: string; inputMode?: string; onChange?: React.ChangeEventHandler<HTMLInputElement> }): React.ReactElement;
export declare function OTPInput(p: { length?: number; value?: string; error?: string; resendIn?: number; label?: string; sentTo?: string }): React.ReactElement;
export declare function SearchField(p: { value?: string; placeholder?: string; onClear?: () => void }): React.ReactElement;
export declare function Chip(p: Children & { selected?: boolean; count?: number; icon?: IconName; disabled?: boolean; onClick?: () => void }): React.ReactElement;
export declare function SegmentedControl(p: { options: string[]; value: string; label?: string; onChange?: (v: string) => void }): React.ReactElement;
export declare function ConsentRow(p: { label: string; required?: boolean; checked?: boolean; detail?: string; linkLabel?: string; error?: string }): React.ReactElement;
export declare function Switch(p: { label: string; detail?: string; checked?: boolean; disabled?: boolean; locked?: boolean }): React.ReactElement;

export declare function TopBar(p: { title: string; large?: boolean; back?: boolean; backLabel?: string; trailing?: React.ReactNode; platform?: 'ios' | 'android' }): React.ReactElement;
export interface TabItem { key: string; label: string; icon: IconName; badge?: boolean }
export declare function TabBar(p: { items?: TabItem[]; value?: string; onChange?: (key: string) => void }): React.ReactElement;
export declare function BookingStepper(p: { steps?: string[]; current?: number }): React.ReactElement;

export declare function Banner(p: Children & { tone?: 'info' | 'success' | 'warning' | 'danger' | 'offline'; title?: string; action?: React.ReactNode; onDismiss?: () => void }): React.ReactElement;
export declare function Toast(p: Children & { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; action?: string }): React.ReactElement;
export declare function Badge(p: Children & { tone?: Tone; icon?: IconName | null }): React.ReactElement;
export declare function Skeleton(p: { lines?: number; media?: boolean }): React.ReactElement;
export declare function EmptyState(p: Children & { icon?: IconName; title: string; actions?: React.ReactNode }): React.ReactElement;
export declare function AsyncStatus(p: Children & { state: 'pending' | 'success' | 'failed' | 'timeout'; title: string; reference?: string; actions?: React.ReactNode }): React.ReactElement;

export declare function Card(p: Children & { tone?: 'surface' | 'tint' | 'brand'; padded?: boolean; onPress?: () => void }): React.ReactElement;
export declare function ListRow(p: { icon?: IconName; title: string; subtitle?: string; value?: string; chevron?: boolean; destructive?: boolean; disabled?: boolean; onPress?: () => void }): React.ReactElement;
export declare function ListGroup(p: Children & { header?: string; footer?: string }): React.ReactElement;
export declare function Sheet(p: Children & { title: string; actions?: React.ReactNode; onClose?: (() => void) | false }): React.ReactElement;
export declare function Dialog(p: Children & { title: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }): React.ReactElement;
export declare function PhotoFrame(p: { src?: string; alt?: string; ratio?: string; label?: string }): React.ReactElement;

export type PriceKind = 'fixed' | 'from' | 'range' | 'perUnit' | 'consultation' | 'promo';
export interface PriceProps { kind?: PriceKind; amount?: number; min?: number; max?: number; unit?: string; was?: number; endsAt?: string; size?: 'md' | 'lg' }
export declare function PriceTag(p: PriceProps): React.ReactElement;
export declare function ServiceCard(p: { category?: string; name: string; duration?: string; price?: PriceProps; consultation?: boolean; photo?: string; layout?: 'stacked' | 'row'; photoRatio?: string; onPress?: () => void }): React.ReactElement;
export declare function ProviderCard(p: { name: string; role?: string; note?: string; photo?: string; selected?: boolean; anyone?: boolean; disabled?: boolean }): React.ReactElement;
export interface Slot { time: string; state?: 'available' | 'selected' | 'unavailable' }
export declare function TimeSlotGrid(p: { date: string; slots?: Slot[]; state?: 'ready' | 'checking' | 'none' | 'conflict'; holdNote?: string }): React.ReactElement;
export declare function BookingSummary(p: { rows: { label: string; value: string }[]; total?: number; dueNow?: number; dueLater?: number; policy?: string }): React.ReactElement;
export declare function PaymentMethodRow(p: { method: 'debit' | 'klarna' | 'affirm'; label: string; detail?: string; state?: 'available' | 'unavailable'; selected?: boolean }): React.ReactElement;
export declare function AppointmentPass(p: { service: string; date: string; time: string; provider?: string; location?: string;
  status?: 'confirmed' | 'pending' | 'changed' | 'cancelled' | 'completed' | 'noshow'; compact?: boolean; sample?: boolean; eyebrow?: string }): React.ReactElement;
export declare function OfferCard(p: { eyebrow?: string; title: string; summary?: string; endsAt?: string; state?: 'live' | 'upcoming' | 'expired' | 'paused'; photo?: string; cta?: string }): React.ReactElement;

export declare function PackageBalance(p: { name: string; total: number; used: number; pending?: number; expires?: string; status?: 'active' | 'expiring' | 'expired'; sample?: boolean }): React.ReactElement;
export declare function GiftCard(p: { amount?: number; balance?: number; recipient?: string; status?: 'payment' | 'scheduled' | 'sent' | 'claimed' | 'refunded'; code?: string; sample?: boolean }): React.ReactElement;
export declare function CreditRow(p: { available?: number; pending?: number; source?: string; expires?: string; reconciling?: boolean; sample?: boolean }): React.ReactElement;
export declare function MemberStatus(p: { tier: string; since?: string; benefits?: string[]; sample?: boolean }): React.ReactElement;
export declare function AccountMatch(p: { state: 'matched' | 'mismatch' | 'notfound'; items?: { icon: IconName; title: string; value?: string }[] }): React.ReactElement;
export declare function SupportContext(p: { topic: string; reference?: string; hours?: string; response?: string }): React.ReactElement;
export declare function CareTimeline(p: { steps: { when: string; title: string; text?: string; state?: 'done' | 'now' | 'upcoming' }[] }): React.ReactElement;

export declare function StaffBar(p: { title?: string; role?: string; env?: 'Production' | 'Staging' | 'Development'; layout?: 'phone' | 'tablet' }): React.ReactElement;
export declare function PublishState(p: { state: 'draft' | 'review' | 'scheduled' | 'live' | 'paused' | 'expired' | 'rejected' | 'archived' | 'deleted'; detail?: string }): React.ReactElement;
export declare function ApprovalItem(p: { kind: string; title: string; changes: { field: string; from: string; to: string }[]; by: string; at: string; risk?: boolean; rejecting?: boolean; hideActions?: boolean }): React.ReactElement;
export declare function AuditEntry(p: { actor: string; action: string; field?: string; from?: string; to?: string; reason?: string; at: string }): React.ReactElement;
export declare function EditConflict(p: { who?: string; when?: string }): React.ReactElement;
export declare function PermissionNotice(p: { action?: string; role?: string }): React.ReactElement;

// Phase 9
export declare function FormSection(p: Children & { title: string; summary?: string; open?: boolean; error?: string; complete?: boolean; columns?: 1 | 2 }): React.ReactElement;
export declare function ImagePicker(p: { src?: string; state?: 'empty' | 'uploading' | 'uploaded' | 'small' | 'rights' | 'alt'; label?: string; alt?: string; ratio?: string; progress?: number }): React.ReactElement;
export declare function MediaTile(p: { src?: string; name: string; rights?: boolean; alt?: boolean; selected?: boolean }): React.ReactElement;
export declare function DateTimeRange(p: { start?: string; end?: string; tz?: string; error?: string; warning?: string; label?: string }): React.ReactElement;
export declare function SettingRow(p: { label: string; detail?: string; kind?: 'toggle' | 'value' | 'stepper'; value?: string | number; checked?: boolean; unit?: string; locked?: boolean | string; changed?: boolean }): React.ReactElement;
export declare function ReorderList(p: { items: { title: string; subtitle?: string }[]; dragging?: number; dropAt?: number }): React.ReactElement;
export declare function ConfirmDialog(p: { kind?: 'archive' | 'delete' | 'restore'; item?: string; affects?: string[] }): React.ReactElement;
export declare function SimpleTextEditor(p: { label: string; value?: string; max?: number; error?: string; rows?: number }): React.ReactElement;
export declare function StatTile(p: { label: string; value?: string; change?: string; trend?: 'up' | 'down'; bars?: number[]; state?: 'ready' | 'empty' | 'loading'; period?: string }): React.ReactElement;
export declare function AreaPicker(p: { areas: { name: string; price: number; selected?: boolean }[]; set?: 'women' | 'men'; max?: number; total?: number; note?: string }): React.ReactElement;
export declare function ServiceBasket(p: { items: { name: string; detail?: string; duration: number; price?: number; priceLabel?: string }[]; totalMinutes: number; total?: number; maxMinutes?: number; compact?: boolean }): React.ReactElement;
export declare function GiftDesignPicker(p: { designs: { key: string; name: string }[]; selected?: string; loading?: boolean }): React.ReactElement;
export declare function WalletPayButton(p: { type?: 'apple' | 'google'; state?: 'available' | 'unavailable'; label?: string }): React.ReactElement;
export declare function RatingSummary(p: { rating?: number; count?: number; source?: string; enabled?: boolean }): React.ReactElement | null;
export declare function FAQBlock(p: { items: { q: string; a: string; open?: boolean }[]; title?: string }): React.ReactElement;
export declare function QueueItem(p: { icon?: IconName; title: string; subtitle?: string; status?: 'new' | 'progress' | 'waiting' | 'done'; since?: string }): React.ReactElement;
export declare function RoleBadge(p: { role: 'Owner' | 'Editor' | 'Front desk' }): React.ReactElement;

export declare function money(n: number): string;

declare global { interface Window { NanoBeauty: Record<string, unknown> } }
