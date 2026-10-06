import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Button, EmptyState } from '../components';
import { t } from '../i18n';
import { useAuth } from './AuthProvider';
import { setReturnTo } from './flow';

/**
 * Personal screens (route table `signIn: true`) ask a guest to sign in, then come back here with the same
 * link parameters (AUTH 11), e.g. the hand-off being checked. The server enforces sign-in too; the gate only
 * avoids showing an empty or failing screen.
 */
export function SignInGate({ children, title = t('gate.title'), body = t('gate.body') }: { children: ReactNode; title?: string; body?: string }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<Record<string, string>>();
  if (status === 'loading') return null;
  if (status === 'signedIn') return <>{children}</>;
  return (
    <EmptyState
      icon="user-circle"
      title={title}
      actions={
        <Button
          size="lg"
          fullWidth
          onPress={() => {
            setReturnTo({ pathname, params } as never);
            router.push('/auth/phone');
          }}
        >
          {t('home.signIn')}
        </Button>
      }
    >
      {body}
    </EmptyState>
  );
}
