import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Banner, Button, Dialog, Text, useToast } from '../components';
import { t } from '../i18n';
import type { Permission } from '@nano/contracts';

/** What the shared chrome needs from an editor: services (useServiceEditor) and NANO-08 items (useEntityEditor). */
type Editor = {
  service: { missing: string[]; highRiskChanges: string[]; state: string } | null;
  problem: 'conflict' | 'offline' | 'failed' | 'invalid' | 'refused' | null;
  /** The server's own sentence for a refusal (completeness, self-action, business rule). */
  message?: string | null;
  readOnly: boolean;
  restored: boolean;
  busy: string | null;
  dirty: boolean;
  loadLatest: () => unknown;
  save: () => Promise<unknown>;
  submit: () => Promise<unknown>;
  publish: () => Promise<'published' | 'waiting' | null>;
};

/** STF-03 shared states on every staff edit screen: conflict, offline (read only), savefailed, restored edits. */
export function EditorBanners({ editor }: { editor: Editor }) {
  const s = editor.service;
  return (
    <>
      {editor.problem === 'conflict' ? (
        <Banner
          tone="danger"
          title={t('stf.conflict')}
          action={
            <Button variant="secondary" size="sm" onPress={editor.loadLatest}>
              {t('stf.loadLatest')}
            </Button>
          }
        >
          {t('stf.conflictBody')}
        </Banner>
      ) : null}
      {editor.problem === 'offline' ? (
        <Banner tone="offline" title={t('stf.offline')}>
          {t('stf.offlineBody')}
        </Banner>
      ) : null}
      {editor.problem === 'refused' ? (
        <Banner tone="danger" title={t('stf.refused')}>
          {editor.message ?? t('error.body')}
        </Banner>
      ) : null}
      {editor.problem === 'failed' || editor.problem === 'invalid' || editor.restored ? (
        <Banner tone="danger" title={t('stf.saveFailed')}>
          {editor.problem === 'invalid' && editor.message ? editor.message : t('stf.saveFailedBody')}
        </Banner>
      ) : null}
      {s && s.missing.length ? (
        <Banner tone="warning" title={t('svc.missingTitle', { count: s.missing.length })}>
          {s.missing.join(' · ')}
        </Banner>
      ) : null}
    </>
  );
}

/**
 * Save draft, then Publish (Owner, after a confirm step — STF-09 self-publish) or Submit (Editor). An Editor never
 * sees Publish (D35); the server enforces the same.
 */
export function EditorActions({
  editor,
  name,
  secondApprover,
  publishPermission = 'content.publish',
}: {
  editor: Editor;
  name: string;
  secondApprover: boolean;
  publishPermission?: Permission;
}) {
  const { me } = useAuth();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const canPublish = !!me?.permissions.includes(publishPermission);
  const off = editor.readOnly || editor.problem === 'conflict' || !editor.service || editor.service.state === 'archived';
  const s = editor.service;
  const risky = s?.highRiskChanges ?? [];
  const price = risky.includes('price') && publishPermission === 'content.publish';
  const other = price ? [] : (risky.filter((r) => r === 'price' || r === 'offerTerms' || r === 'policy') as ('price' | 'offerTerms' | 'policy')[]);
  return (
    <>
      {price ? (
        <Banner tone="info" title={t('svc.priceChange')}>
          {canPublish ? (secondApprover ? t('svc.priceChangeSecond') : t('svc.priceChangeOwner')) : t('svc.priceChangeEditor')}
        </Banner>
      ) : null}
      {other.length ? (
        <Banner tone="info" title={t('stf.highRisk')}>
          {[...other.map((r) => t(`stf.highRisk.${r}`)), canPublish ? (secondApprover ? t('stf.secondApprover') : null) : t('stf.editorSubmit')].filter(Boolean).join(' ')}
        </Banner>
      ) : null}
      <Button
        variant="secondary"
        loading={editor.busy === 'save'}
        disabled={off || !editor.dirty}
        onPress={async () => {
          if (await editor.save()) toast({ tone: 'success', message: t('svc.saved') });
        }}
      >
        {t('svc.saveDraft')}
      </Button>
      {canPublish ? (
        <Button loading={editor.busy === 'publish'} disabled={off || !!s?.missing.length} onPress={() => setConfirming(true)}>
          {t('svc.publish')}
        </Button>
      ) : (
        <Button
          loading={editor.busy === 'submit'}
          disabled={off || s?.state === 'review' || !!s?.missing.length}
          onPress={async () => {
            if (await editor.submit()) toast({ tone: 'success', message: t('svc.submitted') });
          }}
        >
          {t('svc.submit')}
        </Button>
      )}
      <Dialog
        visible={confirming}
        title={t('svc.publishTitle', { name })}
        confirmLabel={t('svc.publish')}
        cancelLabel={t('common.cancel')}
        loading={editor.busy === 'publish'}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          const outcome = await editor.publish();
          setConfirming(false);
          if (outcome) toast({ tone: outcome === 'published' ? 'success' : 'info', message: outcome === 'published' ? t('svc.published') : t('svc.waiting') });
        }}
      >
        <Text variant="body" tone="inkMuted">
          {t('svc.publishBody')}
        </Text>
      </Dialog>
    </>
  );
}
