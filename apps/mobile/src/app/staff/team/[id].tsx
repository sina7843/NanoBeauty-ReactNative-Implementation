import { ROLES, teamMemberSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { Badge, Banner, Button, Dialog, Skeleton, Switch, Text, useToast } from '../../../components';
import { t } from '../../../i18n';
import { problemOf, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/team/[id]` — STF-38 (active, invited, removed). The API keeps at least one Owner. */
export default function TeamMember() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useStaffQuery(['team'], '/v1/staff/team', z.array(teamMemberSchema));
  const member = q.data?.find((m) => m.id === id);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const back = { to: '/staff/team' as Href, label: t('team.title') };

  if (!q.data) return <StaffScreen title={t('team.member')} back={back}>{<Skeleton lines={4} media={false} />}</StaffScreen>;
  if (!member) return <Redirect href="/staff/team" />;
  const current = roles ?? member.roles;

  async function call(path: string, method: 'POST' | 'PUT', body: object, done: string) {
    setBusy(true);
    setProblem(null);
    try {
      const res = await session.authed(path, { method, body });
      queryClient.setQueryData(['staff', 'team'], z.array(teamMemberSchema).parse(res.body));
      toast({ tone: 'success', message: done });
      return true;
    } catch (e) {
      const p = problemOf(e);
      setProblem(p.kind === 'conflict' ? t('stf.conflict') : t('error.body'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffScreen title={t('team.member')} back={back}>
      <Text variant="titleLg">{member.name ?? member.phoneMasked}</Text>
      <Text variant="body" tone="inkMuted">
        {member.phoneMasked}
      </Text>
      {member.status !== 'active' ? <Badge tone={member.status === 'invited' ? 'info' : 'neutral'}>{member.status === 'invited' ? t('team.invited') : t('team.removed')}</Badge> : null}
      {member.status === 'removed' ? <Banner tone="info" title={t('team.removed')}>{t('team.removedNote')}</Banner> : null}
      {member.status === 'invited' ? <Banner tone="info" title={t('team.invited')}>{t('team.inviteNote')}</Banner> : null}
      {member.status === 'active' ? (
        <>
          <Text variant="label">{t('team.rolesHeader')}</Text>
          <View style={styles.group}>
            {ROLES.map((r) => (
              <Switch
                key={r}
                label={r}
                detail={t(`team.role.${r}`)}
                value={current.includes(r)}
                onValueChange={(on) => setRoles(on ? [...current, r] : current.filter((x) => x !== r))}
              />
            ))}
          </View>
          <Button
            loading={busy}
            disabled={!roles || !current.length}
            onPress={async () => {
              if (await call(`/v1/staff/team/${member.id}/roles`, 'PUT', { roles: current }, t('team.saveRoles'))) setRoles(null);
            }}
          >
            {t('team.saveRoles')}
          </Button>
        </>
      ) : null}
      {problem ? <Banner tone="danger" title={problem} /> : null}
      {member.status !== 'removed' ? (
        <Button variant="destructive" onPress={() => setConfirm(true)}>
          {member.status === 'invited' ? t('team.revoke') : t('team.remove')}
        </Button>
      ) : null}
      <Dialog
        visible={confirm}
        title={t('team.removeTitle', { name: member.name ?? member.phoneMasked })}
        confirmLabel={member.status === 'invited' ? t('team.revoke') : t('team.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          const ok = await call(`/v1/staff/team/${encodeURIComponent(member.id)}/remove`, 'POST', {}, t('team.remove'));
          setConfirm(false);
          if (ok && member.status === 'invited') router.replace('/staff/team');
        }}
      >
        <Text variant="body" tone="inkMuted">
          {t('team.removeBody')}
        </Text>
      </Dialog>
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space['2'] },
});
