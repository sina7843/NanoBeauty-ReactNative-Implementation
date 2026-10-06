import { space, typography } from '@nano/design-tokens';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AsyncStatus,
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  Dialog,
  EmptyState,
  IconButton,
  ListGroup,
  ListRow,
  Logo,
  PermissionNotice,
  PhotoFrame,
  PriceTag,
  RoleBadge,
  SampleBadge,
  SegmentedControl,
  Skeleton,
  StaffBar,
  Switch,
  Text,
  TextField,
  useToast,
} from '../../components';
import { haptics } from '../../platform/haptics';
import { ThemeProvider, useTheme, type Scheme } from '../../theme/ThemeProvider';

// Dev-only component showcase (stands in for Storybook — see DECISIONS.md). Literal demo strings here are
// not product copy and never ship in production builds (dev routes redirect there).

const SCHEMES = ['System', 'Light', 'Dark'] as const;

export default function Showcase() {
  const { fonts } = useTheme();
  const [scheme, setScheme] = useState<(typeof SCHEMES)[number]>('System');
  const forced: Scheme | undefined = scheme === 'System' ? undefined : (scheme.toLowerCase() as Scheme);
  return (
    <ThemeProvider fonts={fonts} scheme={forced}>
      <Gallery scheme={scheme} onScheme={(v) => setScheme(v as (typeof SCHEMES)[number])} />
    </ThemeProvider>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="inkMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Gallery({ scheme, onScheme }: { scheme: string; onScheme: (v: string) => void }) {
  const { colors, fonts } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [switchOn, setSwitchOn] = useState(true);
  const [chip, setChip] = useState(true);
  const [segment, setSegment] = useState('Upcoming');
  const [dialog, setDialog] = useState<'none' | 'dialog' | 'archive' | 'delete' | 'restore'>('none');

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.page}>
      <SegmentedControl label="Theme" options={[...SCHEMES]} value={scheme} onChange={onScheme} />
      <Text variant="caption" tone="inkMuted">
        Brand fonts loaded: {fonts.size ? [...fonts].join(', ') : 'none (system fallback)'}
      </Text>

      <Section title="Typography">
        {(Object.keys(typography) as (keyof typeof typography)[]).map((name) => (
          <Text key={name} variant={name}>
            {name}
          </Text>
        ))}
      </Section>

      <Section title="Logo">
        <Logo height={40} />
        <View style={[styles.brand, { backgroundColor: colors.surfaceBrand }]}>
          <Logo height={32} onBrand />
        </View>
        <Logo variant="frame" height={96} />
      </Section>

      <Section title="Buttons">
        <Button onPress={() => haptics.selection()}>Book appointment</Button>
        <Button variant="secondary" icon="calendar-blank">
          Add to calendar
        </Button>
        <Button variant="tertiary">View details</Button>
        <Button variant="destructive">Cancel visit</Button>
        <Button size="sm">Small</Button>
        <Button size="lg" fullWidth>
          Large full width
        </Button>
        <Button loading loadingLabel="Confirming…">
          Confirm
        </Button>
        <Button disabled>Disabled</Button>
        <View style={styles.row}>
          <IconButton icon="x" label="Close" />
          <IconButton icon="bell" label="Notifications" variant="tonal" badge />
          <IconButton icon="pencil-simple" label="Edit" variant="outline" />
          <IconButton icon="trash" label="Delete" disabled />
        </View>
      </Section>

      <Section title="Badges">
        <View style={styles.wrap}>
          {(['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const).map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
          <SampleBadge />
          <RoleBadge role="Owner" />
          <RoleBadge role="Editor" />
          <RoleBadge role="Front desk" />
        </View>
      </Section>

      <Section title="Banners">
        <Banner tone="info" title="Booking continues with Fresha">
          Info banner.
        </Banner>
        <Banner tone="success" title="Confirmed">
          Only after the system of record confirms.
        </Banner>
        <Banner tone="warning" title="Hold ends soon">
          Warning banner.
        </Banner>
        <Banner tone="danger" title="Payment failed" action={<Button variant="secondary" size="sm">Try another method</Button>}>
          Nothing was charged.
        </Banner>
        <Banner tone="offline" title="You’re offline" onDismiss={() => undefined}>
          Offline banner with dismiss.
        </Banner>
      </Section>

      <Section title="Cards and lists">
        <Card>
          <Text variant="headline">Surface card</Text>
        </Card>
        <Card tone="tint">
          <Text variant="headline" tone="onTint">
            Tint card
          </Text>
        </Card>
        <Card tone="brand">
          <Text variant="headline" tone="onBrand">
            Brand card
          </Text>
        </Card>
        <Card onPress={() => undefined} accessibilityLabel="Pressable card">
          <Text variant="headline">Pressable card</Text>
        </Card>
        <ListGroup header="Account" footer="Footer caption.">
          <ListRow icon="user-circle" title="Profile" subtitle="Name, phone, email" onPress={() => undefined} />
          <ListRow icon="receipt" title="Receipts" value="3" onPress={() => undefined} />
          <ListRow icon="lock" title="Disabled row" disabled onPress={() => undefined} />
          <ListRow icon="trash" title="Delete account" destructive onPress={() => undefined} />
        </ListGroup>
      </Section>

      <Section title="Inputs">
        <TextField label="Email" placeholder="name@example.com" helper="We send receipts here." optional />
        <TextField label="Phone" error="Enter a phone number like 604 555 0100" />
        <TextField label="Disabled" value="Read only" disabled />
        <Switch label="Visit reminders" detail="The day before your visit" value={switchOn} onValueChange={setSwitchOn} />
        <Switch label="Booking messages" value locked />
        <Switch label="Disabled switch" value={false} disabled />
        <View style={styles.wrap}>
          <Chip selected={chip} onPress={() => setChip(!chip)}>
            Skin
          </Chip>
          <Chip count={4}>Laser</Chip>
          <Chip disabled>Disabled</Chip>
        </View>
        <SegmentedControl label="Visits" options={['Upcoming', 'Past']} value={segment} onChange={setSegment} />
      </Section>

      <Section title="Prices">
        <PriceTag kind="fixed" amount={250} />
        <PriceTag kind="from" amount={120} />
        <PriceTag kind="range" min={300} max={600} />
        <PriceTag kind="perUnit" amount={12} unit="unit" />
        <PriceTag kind="consultation" />
        <PriceTag kind="promo" amount={199} was={250} endsAt="31 Oct, 11:59 pm PT" size="lg" />
      </Section>

      <Section title="Loading, empty and results (demo states)">
        <PhotoFrame ratio="16 / 9" />
        <Skeleton lines={3} />
        <EmptyState icon="calendar-blank" title="No visits yet" actions={<Button fullWidth>Book appointment</Button>}>
          Empty state body.
        </EmptyState>
        {(['pending', 'success', 'failed', 'timeout'] as const).map((state) => (
          <Card key={state}>
            <AsyncStatus state={state} title={`AsyncStatus: ${state}`} reference="NB-00000">
              Demo only; success renders after the authoritative system confirms.
            </AsyncStatus>
          </Card>
        ))}
      </Section>

      <Section title="Overlays">
        <Button variant="secondary" onPress={() => setDialog('dialog')}>
          Dialog
        </Button>
        <Button variant="secondary" onPress={() => setDialog('archive')}>
          ConfirmDialog: archive
        </Button>
        <Button variant="secondary" onPress={() => setDialog('delete')}>
          ConfirmDialog: delete draft
        </Button>
        <Button variant="secondary" onPress={() => setDialog('restore')}>
          ConfirmDialog: restore
        </Button>
        <Button variant="secondary" onPress={() => toast({ tone: 'success', message: 'Preference saved', action: { label: 'Undo', onPress: () => undefined } })}>
          Toast
        </Button>
        <Button variant="secondary" onPress={() => router.push('/dev/sheet')}>
          Native sheet
        </Button>
      </Section>

      <Section title="Staff boundary">
        <StaffBar role="Owner" env="Production" title="Services" />
        <StaffBar role="Editor" env="Staging" />
        <PermissionNotice role="Editor" action="publish campaigns" onAskAdmin={() => undefined} />
      </Section>

      <Dialog
        visible={dialog === 'dialog'}
        title="Cancel this visit?"
        confirmLabel="Cancel visit"
        cancelLabel="Keep visit"
        destructive
        onConfirm={() => setDialog('none')}
        onCancel={() => setDialog('none')}
      >
        Demo consequence text.
      </Dialog>
      {dialog === 'archive' || dialog === 'delete' || dialog === 'restore' ? (
        <ConfirmDialog
          visible
          kind={dialog}
          item="HydraFacial"
          affects={['Demo affected item']}
          onConfirm={() => setDialog('none')}
          onCancel={() => setDialog('none')}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space['5'], gap: space['8'] },
  section: { gap: space['3'] },
  row: { flexDirection: 'row', gap: space['2'] },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space['2'] },
  brand: { padding: space['4'], alignItems: 'flex-start', borderRadius: 14 },
});
