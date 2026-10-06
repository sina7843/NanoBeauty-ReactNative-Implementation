import type { Service } from '@nano/contracts';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { AreaPicker, Button, SampleBadge, Screen, Skeleton, Text } from '../../components';
import { basket } from '../../booking/basket';
import { ContentGate } from '../../content/ContentGate';
import { useCatalog } from '../../content/queries';
import { t } from '../../i18n';
import { OLD_LINK_HREF } from '../../navigation/routes';
import { useSettings } from '../../settings/useSettings';

/** `/book/areas?service=` — BKG-10 (some, none, max; women / men). Prices are the catalogue's, summed only. */
export default function ChooseAreas() {
  const { service } = useLocalSearchParams<{ service?: string }>();
  const catalog = useCatalog();
  return (
    <>
      <Stack.Screen options={{ title: t('trt.chooseAreas') }} />
      <ContentGate query={catalog} skeleton={<Skeleton lines={4} media={false} />}>
        {(data) => {
          const svc = data.services.find((s) => s.id === service && s.status === 'live' && s.perArea && s.areas);
          // Unknown, non-area or no-longer-bookable treatment: same as any old link.
          return svc ? <Areas service={svc} /> : <Redirect href={OLD_LINK_HREF} />;
        }}
      </ContentGate>
    </>
  );
}

function Areas({ service }: { service: Service }) {
  const router = useRouter();
  const mode = useSettings().data?.data.settings.bookingMode ?? 'handoff';
  const areas = service.areas!;
  const existing = basket.get().find((i) => i.serviceId === service.id)?.areas;
  const [set, setSet] = useState<'women' | 'men'>(existing?.set ?? 'women');
  const [names, setNames] = useState<string[]>(existing?.names ?? []);
  const max = areas.maxAreasPerVisit;

  const done = () => {
    basket.setAreas(service.id, { set, names });
    // Hand-off: straight on to Fresha (BKG-12 first time); in-app: the basket (BKG-11, NANO-09).
    router.push(mode === 'handoff' ? '/book/how-it-works' : '/book/basket');
  };

  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth disabled={names.length === 0} iconAfter={mode === 'handoff' ? 'arrow-square-out' : undefined} onPress={done}>
          {names.length === 0 ? t('areas.chooseOne') : mode === 'handoff' ? t('bkg.continueFresha') : t('bkg.continue')}
        </Button>
      }
    >
      <Text variant="titleLg" accessibilityRole="header">
        {service.name}
      </Text>
      {service.sample ? <SampleBadge /> : null}
      <AreaPicker
        areas={areas[set]}
        set={set}
        onSet={(next) => {
          setSet(next);
          setNames([]); // areas belong to one set
        }}
        selected={names}
        onToggle={(name) => setNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < max ? [...prev, name] : prev))}
        max={max}
      />
    </Screen>
  );
}
