import type { Visit, VisitsResponse } from '@nano/contracts';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { SignInGate } from '../auth/SignInGate';
import { Banner, Button, Screen, Skeleton } from '../components';
import { t } from '../i18n';
import { OLD_LINK_HREF } from '../navigation/routes';
import { findVisit, useVisits } from './visits';

type Render = (visit: Visit, data: VisitsResponse, offline: boolean) => ReactNode;

/**
 * Loads one of the signed-in customer's visits from the Visits list (works offline from the saved copy) inside a
 * pushed-screen `Screen`; `footer` fills its fixed action bar once the visit is known.
 * A visit that isn't theirs, or no longer listed, is treated as an old link.
 */
export function VisitGate({ id, children, footer }: { id: string | undefined; children: Render; footer?: Render }) {
  const { status } = useAuth();
  if (status !== 'signedIn') {
    return (
      <Screen topInset={false}>
        <SignInGate>{null}</SignInGate>
      </Screen>
    );
  }
  return <Load id={id} footer={footer}>{children}</Load>;
}

function Load({ id, children, footer }: { id: string | undefined; children: Render; footer?: Render }) {
  const visits = useVisits();
  const visit = visits.data ? findVisit(visits.data.data, id) : undefined;
  if (visits.data && !visit) return <Redirect href={OLD_LINK_HREF} />;
  const args = visit && visits.data ? ([visit, visits.data.data, visits.data.source === 'cache'] as const) : null;
  return (
    <Screen topInset={false} footer={args && footer ? footer(...args) : undefined}>
      {args ? (
        children(...args)
      ) : visits.isError ? (
        <Banner
          tone="danger"
          title={t('error.title')}
          action={
            <Button variant="secondary" size="sm" onPress={() => visits.refetch()}>
              {t('error.retry')}
            </Button>
          }
        >
          {t('error.body')}
        </Banner>
      ) : (
        <Skeleton lines={3} />
      )}
    </Screen>
  );
}
