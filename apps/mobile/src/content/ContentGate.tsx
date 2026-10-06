import type { UseQueryResult } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ApiError } from '../api/client';
import type { ReactNode } from 'react';
import { Banner, Button, Skeleton } from '../components';
import { t } from '../i18n';
import { OLD_LINK_HREF } from '../navigation/routes';
import type { Cached } from './cache';

/**
 * Standard loading / error / offline-copy states for public content (guideline 09). A saved copy is always
 * labelled as such; with no copy at all the screen says it couldn't load and offers a retry — never a guess.
 */
export function ContentGate<T>({
  query,
  children,
  skeleton = <Skeleton lines={3} />,
  offlineBanner = true,
}: {
  query: UseQueryResult<Cached<T>>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  offlineBanner?: boolean;
}) {
  if (query.data) {
    return (
      <>
        {offlineBanner && query.data.source === 'cache' ? (
          <Banner tone="offline" title={t('offline.title')}>
            {t('offline.banner')}
          </Banner>
        ) : null}
        {children(query.data.data)}
      </>
    );
  }
  // Unknown or unpublished items (old offer, article or policy link) land on Home with the note (LEG 07).
  if (query.error instanceof ApiError && query.error.code === 'not_found') return <Redirect href={OLD_LINK_HREF} />;
  if (query.isError) {
    return (
      <Banner
        tone="danger"
        title={t('error.title')}
        action={
          <Button variant="secondary" size="sm" onPress={() => query.refetch()}>
            {t('error.retry')}
          </Button>
        }
      >
        {t('error.body')}
      </Banner>
    );
  }
  return <>{skeleton}</>;
}
