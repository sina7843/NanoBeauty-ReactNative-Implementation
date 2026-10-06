import { ROLES, teamMemberSchema } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../../auth/AuthProvider';
import { Badge, Banner, Button, Chip, ListGroup, ListRow, Skeleton, Text, TextField, useToast } from '../../../components';
import { t } from '../../../i18n';
import { problemOf, useStaffQuery } from '../../../staff/api';
import { StaffScreen } from '../../../staff/StaffScreen';

/** `/staff/team` — STF-13: who has access, their roles, and invites (Owner only, D34). */
export default function Team() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const q = useStaffQuery(['team'], '/v1/staff/team', z.array(teamMemberSchema));
  const [inviting, setInviting] = useState(false);
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState<string[]>(['Front desk']);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    setError(undefined);
    try {
      const res = await session.authed('/v1/staff/team/invites', { method: 'POST', body: { phone, roles } });
      queryClient.setQueryData(['staff', 'team'], z.array(teamMemberSchema).parse(res.body));
      setInviting(false);
      setPhone('');
      toast({ tone: 'success', message: t('team.invited') });
    } catch (e) {
      const p = problemOf(e);
      setError(p.kind === 'invalid' ? t('aut.phone.invalid') : p.kind === 'conflict' ? t('stf.conflict') : t('error.body'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffScreen title={t('team.title')}>
      <Text variant="body" tone="inkMuted">
        {t('team.intro')}
      </Text>
      {q.data ? (
        <ListGroup>
          {q.data.map((m) => (
            <View key={m.id}>
              <ListRow
                title={m.name ?? m.phoneMasked}
                subtitle={[m.name ? m.phoneMasked : null, m.roles.join(' + ') || null].filter(Boolean).join(' · ')}
                onPress={() => router.push(`/staff/team/${encodeURIComponent(m.id)}` as Href)}
              />
              {m.status !== 'active' ? (
                <View style={styles.badge}>
                  <Badge tone={m.status === 'invited' ? 'info' : 'neutral'}>{m.status === 'invited' ? t('team.invited') : t('team.removed')}</Badge>
                </View>
              ) : null}
            </View>
          ))}
        </ListGroup>
      ) : (
        <Skeleton lines={4} media={false} />
      )}
      <ListGroup header={t('team.roles')}>
        {ROLES.map((r) => (
          <ListRow key={r} title={r} subtitle={t(`team.role.${r}`)} chevron={false} />
        ))}
      </ListGroup>
      {inviting ? (
        <View style={styles.form}>
          <TextField label={t('team.invitePhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={error} />
          <Text variant="label">{t('team.rolesHeader')}</Text>
          <View style={styles.chips}>
            {ROLES.map((r) => (
              <Chip key={r} selected={roles.includes(r)} onPress={() => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))}>
                {r}
              </Chip>
            ))}
          </View>
          <Text variant="caption" tone="inkMuted">
            {t('team.inviteNote')}
          </Text>
          <Button loading={busy} disabled={!roles.length || phone.trim().length < 7} onPress={invite}>
            {t('team.inviteSend')}
          </Button>
        </View>
      ) : (
        <Button icon="user-gear" onPress={() => setInviting(true)}>
          {t('team.invite')}
        </Button>
      )}
      {q.isError ? <Banner tone="danger" title={t('error.title')} /> : null}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'flex-start', paddingHorizontal: space['4'], paddingBottom: space['2'] },
  form: { gap: space['3'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
});
