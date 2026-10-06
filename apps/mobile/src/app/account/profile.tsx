import { formatPhone, meSchema, normalizePhone, otpStartResponseSchema, type Me, type OtpStartResponse } from '@nano/contracts';
import { space } from '@nano/design-tokens';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { CodeStep } from '../../account/CodeStep';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { SignInGate } from '../../auth/SignInGate';
import { Banner, Button, Dialog, Screen, Text, TextField, useToast } from '../../components';
import { t } from '../../i18n';
import { useDismissGuard } from '../../navigation/useDismissGuard';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `/account/profile` — ACC-02 (view, phone, error). A new number is saved only after its code is verified. */
export default function Profile() {
  return (
    <>
      <Stack.Screen options={{ title: t('prof.title') }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SignInGate>
          <ProfileForm />
        </SignInGate>
      </KeyboardAvoidingView>
    </>
  );
}

function ProfileForm() {
  const router = useRouter();
  const toast = useToast();
  const { me, session, refreshMe } = useAuth();
  const c = me?.customer;
  const [first, setFirst] = useState(c?.firstName ?? '');
  const [last, setLast] = useState(c?.lastName ?? '');
  const [email, setEmail] = useState(c?.email ?? '');
  const [phone, setPhone] = useState(c ? formatPhone(c.phone) : '');
  const [errors, setErrors] = useState<{ first?: string; last?: string; email?: string; phone?: string }>({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<OtpStartResponse | null>(null);

  const newPhone = normalizePhone(phone);
  const phoneChanged = !!c && phone.trim() !== formatPhone(c.phone) && newPhone !== c.phone;
  const dirty = !!c && (first !== (c.firstName ?? '') || last !== (c.lastName ?? '') || email !== (c.email ?? '') || phoneChanged);
  const guard = useDismissGuard(dirty && !busy);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  async function saveDetails(): Promise<Me> {
    const res = await session.authed('/v1/me/profile', {
      method: 'PUT',
      body: { firstName: first.trim(), lastName: last.trim(), email: email.trim() || null },
    });
    return meSchema.parse(res.body);
  }

  async function save() {
    const next: typeof errors = {};
    if (!first.trim()) next.first = t('prof.firstRequired');
    if (!last.trim()) next.last = t('prof.lastRequired');
    if (email.trim() && !EMAIL.test(email.trim())) next.email = t('aut.profile.emailInvalid');
    if (phoneChanged && !newPhone) next.phone = t('aut.phone.invalid');
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    setFailed(false);
    try {
      // A new number goes first; the other fields are saved once it is verified, so nothing changes half-way.
      if (phoneChanged) {
        const res = await session.authed('/v1/me/phone/start', { method: 'POST', body: { phone } });
        setChallenge(otpStartResponseSchema.parse(res.body));
        return;
      }
      await saveDetails();
      await refreshMe();
      toast({ tone: 'success', message: t('prof.saved') });
      leave();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'validation_failed') setErrors({ phone: t('aut.phone.invalid') });
      else setFailed(true); // the typed values stay on screen
    } finally {
      setBusy(false);
    }
  }

  if (challenge) {
    return (
      <Screen topInset={false}>
        <Text variant="displayMd" accessibilityRole="header">
          {t('prof.codeTitle')}
        </Text>
        <CodeStep
          initial={challenge}
          resend={() => session.authed('/v1/me/phone/start', { method: 'POST', body: { phone } })}
          confirm={async (challengeId, code) => {
            await session.authed('/v1/me/phone/verify', { method: 'POST', body: { challengeId, code } });
            setBusy(true); // saved: leaving no longer asks about unsaved changes
            // The number is changed; a failure saving the other fields is reported but doesn't undo that.
            const rest = await saveDetails().then(
              () => true,
              () => false,
            );
            await refreshMe();
            toast(rest ? { tone: 'success', message: t('prof.saved') } : { tone: 'warning', message: t('prof.partial') });
            leave();
          }}
          describe={(e) => (e.code === 'conflict' ? t('prof.taken') : undefined)}
        />
        <Button variant="tertiary" onPress={() => setChallenge(null)}>
          {t('aut.code.otherNumber')}
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      topInset={false}
      footer={
        <Button size="lg" fullWidth loading={busy} disabled={!dirty} onPress={save}>
          {phoneChanged ? t('prof.sendCode') : failed ? t('prof.retry') : t('prof.save')}
        </Button>
      }
    >
      {failed ? (
        <Banner tone="danger" title={t('prof.errorTitle')}>
          {t('prof.errorBody')}
        </Banner>
      ) : null}
      <View style={styles.group}>
        <TextField label={t('prof.first')} value={first} onChangeText={setFirst} error={errors.first} autoComplete="given-name" textContentType="givenName" maxLength={60} />
        <TextField label={t('prof.last')} value={last} onChangeText={setLast} error={errors.last} autoComplete="family-name" textContentType="familyName" maxLength={60} />
        <TextField
          label={t('prof.email')}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          maxLength={254}
          optional
        />
        <TextField
          label={t('prof.phone')}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          helper={phoneChanged ? t('prof.phoneHelpNew') : t('prof.phoneHelp')}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={20}
        />
      </View>
      <Text variant="caption" tone="inkMuted">
        {t('prof.note')}
      </Text>
      <Dialog
        visible={guard.asking}
        title={t('prof.discardTitle')}
        confirmLabel={t('prof.discard')}
        cancelLabel={t('prof.keepEditing')}
        destructive
        onConfirm={guard.discard}
        onCancel={guard.keepEditing}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space['4'] },
});
