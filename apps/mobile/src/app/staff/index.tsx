import { staffSummarySchema, type Permission } from '@nano/contracts';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { Banner, ListGroup, ListRow } from '../../components';
import { t, type StringKey } from '../../i18n';
import { useStaffQuery } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';

type Item = { label: StringKey; href: Href | null; needs: Permission };
const SECTIONS: { title: StringKey; items: Item[] }[] = [
  {
    title: 'stf.section.content',
    items: [
      { label: 'stf.services', href: '/staff/services', needs: 'content.draft' },
      { label: 'stf.categories', href: '/staff/taxonomy', needs: 'content.draft' },
      { label: 'stf.media', href: '/staff/media', needs: 'content.draft' },
      { label: 'stf.import', href: '/staff/import', needs: 'content.draft' },
      { label: 'stf.approvals', href: '/staff/approvals', needs: 'content.publish' },
    ],
  },
  {
    title: 'stf.section.people',
    items: [{ label: 'stf.team', href: '/staff/team', needs: 'team.manage' }],
  },
  {
    title: 'stf.section.settings',
    items: [{ label: 'stf.audit', href: '/staff/audit', needs: 'audit.view' }],
  },
];

/**
 * `/staff` — STF-01. Sections are built from the server's permissions (D34): a role sees only what it can use.
 * Today, front desk and selling sections arrive with NANO-08.
 */
export default function StaffHome() {
  const router = useRouter();
  const { me } = useAuth();
  const can = (p: Permission) => !!me?.permissions.includes(p);
  const summary = useStaffQuery(['summary'], '/v1/staff/summary', staffSummarySchema, can('content.draft'));
  const visible = SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => can(i.needs)) })).filter((s) => s.items.length);
  const waiting = summary.data;
  return (
    <StaffScreen title={t('stf.home')} back={{ to: '/account', label: t('acc.title') }}>
      {waiting && waiting.myWaiting > 0 && !can('content.publish') ? <Banner tone="info" title={t('stf.myWaiting', { count: waiting.myWaiting })} /> : null}
      {visible.map((section) => (
        <ListGroup key={section.title} header={t(section.title)}>
          {section.items.map((i) => (
            <ListRow
              key={i.label}
              title={t(i.label)}
              value={i.label === 'stf.approvals' && waiting?.waitingApprovals ? t('stf.approvalsWaiting', { count: waiting.waitingApprovals }) : undefined}
              onPress={i.href ? () => router.push(i.href!) : undefined}
              disabled={!i.href}
            />
          ))}
        </ListGroup>
      ))}
    </StaffScreen>
  );
}
