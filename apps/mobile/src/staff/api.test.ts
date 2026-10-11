import { ApiError } from '../api/client';
import { permissionPhrase, problemOf, problemText } from './api';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

describe('staff error handling (ST-3, ST-7, ST-8)', () => {
  it('tells a stale version apart from a business refusal with its own sentence', () => {
    expect(problemOf(new ApiError('conflict', 409, null, { serverMessage: 'Someone else changed this. Load the latest version.' })).kind).toBe('conflict');
    expect(problemOf(new ApiError('conflict', 409, null, { serverMessage: 'Customers have seen this: archive it instead.' }))).toEqual({ kind: 'refused', message: 'Customers have seen this: archive it instead.' });
    expect(problemText(new ApiError('conflict', 409, null, { serverMessage: 'Add a description before submitting.' }))).toBe('Add a description before submitting.');
  });
  it('shows self-action 403s inline; only a missing permission opens STF-14', () => {
    const { router } = jest.requireMock('expo-router') as { router: { replace: jest.Mock } };
    expect(problemOf(new ApiError('forbidden', 403, null, { serverMessage: 'Someone other than the submitter must decide.' })).kind).toBe('refused');
    expect(router.replace).not.toHaveBeenCalled();
    problemOf(new ApiError('forbidden', 403, null, { missingPermission: 'selling.publish' }));
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/staff/denied', params: { permission: 'selling.publish' } });
  });
  it('turns permission keys into words, never the raw key', () => {
    expect(permissionPhrase('selling.publish')).toBe('publish offers and packages');
    expect(permissionPhrase('made.up')).toBe('do this');
    expect(permissionPhrase(undefined)).toBe('do this');
  });
});
