import { Banner, Button } from '../components';
import { t } from '../i18n';
import type { SaveProblem } from './api';

/** STF-31 states for settings screens: conflict (load latest), offline (read only), save failed, and the server's notice. */
export function SettingsBanners({ problem, notice, reload }: { problem: SaveProblem | null; notice: string | null; reload: () => unknown }) {
  return (
    <>
      {problem === 'conflict' ? (
        <Banner
          tone="danger"
          title={t('stf.conflict')}
          action={
            <Button variant="secondary" size="sm" onPress={reload}>
              {t('stf.loadLatest')}
            </Button>
          }
        >
          {t('stf.conflictBody')}
        </Banner>
      ) : problem === 'offline' ? (
        <Banner tone="offline" title={t('stf.offline')}>
          {t('stf.offlineBody')}
        </Banner>
      ) : problem ? (
        <Banner tone="warning" title={t('stf.saveFailed')}>
          {t('stf.saveFailedBody')}
        </Banner>
      ) : null}
      {notice ? <Banner tone="success" title={t('stf.saved')}>{notice}</Banner> : null}
    </>
  );
}
