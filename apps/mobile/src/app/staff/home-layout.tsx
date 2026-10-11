import { homeLayoutViewSchema, type HomeLayoutView } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { Banner, Button, ListGroup, ListRow, Skeleton, Switch, Text, useToast } from '../../components';
import { t } from '../../i18n';
import { settingsQueryKey } from '../../settings/useSettings';
import { problemOf, useStaffQuery, type SaveProblem } from '../../staff/api';
import { SettingsBanners } from '../../staff/SettingsChrome';
import { StaffScreen } from '../../staff/StaffScreen';

/** `/staff/home-layout` — STF-34: up to two offers on Home, in order, and the rating line. Editors can look; the Owner saves. */
export default function HomeLayout() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session, me } = useAuth();
  const canSave = !!me?.permissions.includes('selling.publish');
  const view = useStaffQuery(['home-layout'], '/v1/staff/home-layout', homeLayoutViewSchema);
  const [edit, setEdit] = useState<{ offers: string[]; ratingLine: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const v = view.data;
  const f = edit ?? (v ? { offers: v.offers, ratingLine: v.ratingLine } : null);
  const title = (id: string) => v?.candidates.find((c) => c.id === id)?.title ?? id;

  async function save() {
    if (!v || !f) return;
    setBusy(true);
    try {
      const next: HomeLayoutView = homeLayoutViewSchema.parse((await session.authed('/v1/staff/home-layout', { method: 'PUT', body: { version: v.version, ...f } })).body);
      queryClient.setQueryData(['staff', 'home-layout'], next);
      queryClient.invalidateQueries({ queryKey: settingsQueryKey });
      setEdit(null);
      setProblem(null);
      toast({ tone: 'success', message: t('stf.saved') });
    } catch (e) {
      const p = problemOf(e);
      setProblem(p.kind);
      setMessage(p.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffScreen title={t('stf.homeLayout')}>
      <SettingsBanners problem={problem} message={message} notice={null} reload={() => (setEdit(null), setProblem(null), view.refetch())} />
      {f && v ? (
        <>
          <ListGroup header={t('home.offers')} footer={t('home.max')}>
            {f.offers.map((id, i) => (
              <View key={id}>
                <ListRow title={`${t('home.slot', { n: i + 1 })} · ${title(id)}`} chevron={false} />
                {canSave ? (
                  <View style={styles.rowActions}>
                    {i > 0 ? (
                      <Button variant="tertiary" size="sm" onPress={() => setEdit({ ...f, offers: [f.offers[1]!, f.offers[0]!] })}>
                        {t('home.up')}
                      </Button>
                    ) : null}
                    <Button variant="tertiary" size="sm" onPress={() => setEdit({ ...f, offers: f.offers.filter((x) => x !== id) })}>
                      {t('home.remove')}
                    </Button>
                  </View>
                ) : null}
              </View>
            ))}
          </ListGroup>
          {v.candidates.length ? (
            <ListGroup>
              {v.candidates
                .filter((c) => !f.offers.includes(c.id))
                .map((c) => (
                  <ListRow
                    key={c.id}
                    title={c.title}
                    subtitle={t(`stf.phase.${c.phase}` as 'stf.phase.live')}
                    value={canSave && f.offers.length < 2 ? t('home.add') : undefined}
                    disabled={!canSave || f.offers.length >= 2}
                    onPress={() => setEdit({ ...f, offers: [...f.offers, c.id] })}
                  />
                ))}
            </ListGroup>
          ) : (
            <Banner tone="info" title={t('home.none')} />
          )}
          <Switch label={t('home.rating')} value={f.ratingLine} disabled={!canSave} onValueChange={(on) => setEdit({ ...f, ratingLine: on })} />
          {canSave ? (
            <Button loading={busy} disabled={!edit} onPress={save}>
              {t('stf.save')}
            </Button>
          ) : (
            <Text variant="caption" tone="inkMuted">
              {t('home.readOnly')}
            </Text>
          )}
        </>
      ) : (
        <Skeleton lines={5} media={false} />
      )}
    </StaffScreen>
  );
}

const styles = StyleSheet.create({ rowActions: { flexDirection: 'row', gap: space['2'], justifyContent: 'flex-end', paddingHorizontal: space['4'], paddingBottom: space['2'] } });
