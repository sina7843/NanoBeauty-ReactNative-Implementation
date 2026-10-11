import { inboxRowSchema, staffSummarySchema, todaySchema, type Permission } from '@nano/contracts';
import { radius, space } from '@nano/design-tokens';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../auth/AuthProvider';
import { Banner, Icon, Text, type IconName } from '../../components';
import { pressFeedback } from '../../components/press';
import { t, type StringKey } from '../../i18n';
import { useStaffQuery } from '../../staff/api';
import { StaffScreen } from '../../staff/StaffScreen';
import { useTheme } from '../../theme/ThemeProvider';

/** Every publish permission: the API's approvals queue accepts any of them (ST-23). */
const PUBLISH: Permission[] = ['content.publish', 'selling.publish', 'professionals.publish', 'policies.publish'];

type Item = { label: StringKey; href: Href; icon: IconName; needs: Permission[] };
const SECTIONS: { title: StringKey; items: Item[] }[] = [
  {
    title: 'stf.section.frontDesk',
    items: [
      { label: 'stf.redeem', href: '/staff/redeem', icon: 'wallet', needs: ['value.redeem'] },
      { label: 'stf.lookup', href: '/staff/lookup', icon: 'magnifying-glass', needs: ['value.lookup'] },
      { label: 'stf.customers', href: '/staff/customers', icon: 'identification-card', needs: ['customers.view'] },
    ],
  },
  {
    title: 'stf.section.content',
    items: [
      { label: 'stf.services', href: '/staff/services', icon: 'sparkle', needs: ['content.draft'] },
      { label: 'stf.categories', href: '/staff/taxonomy', icon: 'check-square', needs: ['content.draft'] },
      { label: 'stf.media', href: '/staff/media', icon: 'eye', needs: ['content.draft'] },
      { label: 'stf.import', href: '/staff/import', icon: 'archive', needs: ['content.draft'] },
      { label: 'stf.supportContent', href: '/staff/support-content', icon: 'question', needs: ['content.draft'] },
    ],
  },
  {
    title: 'stf.section.selling',
    items: [
      { label: 'stf.campaigns', href: '/staff/campaigns', icon: 'star', needs: ['selling.draft'] },
      { label: 'stf.packages', href: '/staff/packages', icon: 'package', needs: ['selling.draft'] },
      { label: 'stf.giftCards', href: '/staff/gift-cards', icon: 'gift', needs: ['giftcard.actions'] },
      { label: 'stf.giftSettings', href: '/staff/gift-cards/settings', icon: 'credit-card', needs: ['giftcard.settings'] },
      { label: 'stf.promoCodes', href: '/staff/promo-codes', icon: 'ticket', needs: ['selling.draft'] },
      { label: 'stf.homeLayout', href: '/staff/home-layout', icon: 'house', needs: ['selling.draft'] },
      { label: 'stf.push', href: '/staff/push', icon: 'bell', needs: ['push.send'] },
    ],
  },
  {
    title: 'stf.section.people',
    items: [
      { label: 'stf.professionals', href: '/staff/professionals', icon: 'user-circle', needs: ['professionals.draft'] },
      { label: 'stf.team', href: '/staff/team', icon: 'user-gear', needs: ['team.manage'] },
    ],
  },
  {
    title: 'stf.section.reports',
    items: [
      { label: 'stf.clinicInfo', href: '/staff/settings/clinic', icon: 'storefront', needs: ['clinic.manage'] },
      { label: 'stf.rules', href: '/staff/settings/rules', icon: 'sliders-horizontal', needs: ['rules.manage'] },
      { label: 'stf.policies', href: '/staff/policies', icon: 'seal-check', needs: ['policies.draft'] },
      { label: 'stf.reports', href: '/staff/reports', icon: 'receipt', needs: ['reports.view'] },
      { label: 'stf.audit', href: '/staff/audit', icon: 'clock-counter-clockwise', needs: ['audit.view'] },
      { label: 'stf.approvals', href: '/staff/approvals', icon: 'check-circle', needs: PUBLISH },
    ],
  },
];

/** One STF-01 tile: icon, optional count, label. Three to a row. */
function Tile({ label, icon, count, onPress }: { label: string; icon: IconName; count?: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      onPress={onPress}
      {...pressFeedback([styles.tile, { backgroundColor: colors.surface, borderColor: colors.line }], { pressedColor: colors.surfacePressed, rippleColor: colors.surfacePressed })}
    >
      <View style={styles.tileTop}>
        <Icon name={icon} size={20} tone="primary" />
        {count === undefined ? null : <Text variant="headline">{String(count)}</Text>}
      </View>
      <Text variant="caption" strong>
        {label}
      </Text>
    </Pressable>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/**
 * `/staff` — STF-01 tile grid. Today counts, then sections built from the server's permissions (D34): a role sees
 * only what it can use, and every gate matches the API's (ST-23).
 */
export default function StaffHome() {
  const router = useRouter();
  const { me } = useAuth();
  const can = (any: Permission[]) => any.some((p) => !!me?.permissions.includes(p));
  const summary = useStaffQuery(['summary'], '/v1/staff/summary', staffSummarySchema, !!me?.permissions.length);
  const today = useStaffQuery(['today'], '/v1/staff/today', todaySchema, can(['today.view']));
  const inbox = useStaffQuery(['inbox', 'open'], '/v1/staff/inbox?status=open', z.array(inboxRowSchema), can(['inbox.manage']));
  const visible = SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => can(i.needs)) })).filter((s) => s.items.length);
  const waiting = summary.data;
  const go = (href: Href) => () => router.push(href);
  return (
    <StaffScreen title={t('stf.home')} back={{ to: '/account', label: t('acc.title') }}>
      {can(['today.view', 'inbox.manage']) ? (
        <>
          <Text variant="overline" tone="inkMuted">
            {t('stf.today')}
          </Text>
          <Grid>
            {can(['today.view']) ? <Tile label={t('stf.tile.visits')} icon="calendar-check" count={today.data?.visits.length} onPress={go('/staff/today')} /> : null}
            {can(['today.view']) ? <Tile label={t('stf.tile.requests')} icon="clock" count={today.data?.requests.length} onPress={go('/staff/today')} /> : null}
            {can(['inbox.manage']) ? <Tile label={t('stf.tile.inbox')} icon="chat-circle-text" count={inbox.data?.length} onPress={go('/staff/inbox')} /> : null}
          </Grid>
        </>
      ) : null}
      {waiting && waiting.myWaiting > 0 && !can(PUBLISH) ? (
        <Banner tone="info" title={t('stf.myWaitingTitle')}>
          {t('stf.myWaiting', { count: waiting.myWaiting })}
        </Banner>
      ) : null}
      {visible.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text variant="overline" tone="inkMuted">
            {t(section.title)}
          </Text>
          <Grid>
            {section.items.map((i) => (
              <Tile key={i.label} label={t(i.label)} icon={i.icon} count={i.label === 'stf.approvals' && waiting?.waitingApprovals ? waiting.waitingApprovals : undefined} onPress={go(i.href)} />
            ))}
          </Grid>
        </View>
      ))}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space['2'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  // Three per row: (100% − two 8 pt gaps) / 3.
  tile: { flexBasis: '31%', flexGrow: 1, maxWidth: '33%', minHeight: 72, gap: space['1'], padding: space['3'], borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
