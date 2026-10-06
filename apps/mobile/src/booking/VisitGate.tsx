import type { Visit, VisitsResponse } from '@nano/contracts';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { SignInGate } from '../auth/SignInGate';
import { Banner, Button, Skeleton } from '../components';
import { t } from '../i18n';
import { OLD_LINK_HREF } from '../navigation/routes';
import { findVisit, useVisits } from './visits';

/**
 * Loads one of the signed-in customer's visits from the Visits list (works offline from the saved copy).
 * A visit that isn't theirs, or no longer listed, is treated as an old link.
 */
export function VisitGate({ id, children }: { id: string | undefined; children: (visit: Visit, data: VisitsResponse, offline: boolean) => ReactNode }) {
  return (
    <SignInGate>
      <Load id={id}>{children}</Load>
    </SignInGate>
  );
}

function Load({ id, children }: { id: string | undefined; children: (visit: Visit, data: VisitsResponse, offline: boolean) => ReactNode }) {
  const visits = useVisits();
  if (visits.data) {
    const visit = findVisit(visits.data.data, id);
    return visit ? <>{children(visit, visits.data.data, visits.data.source === 'cache')}</> : <Redirect href={OLD_LINK_HREF} />;
  }
  if (visits.isError) {
    return (
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
    );
  }
  return <Skeleton lines={3} />;
}
