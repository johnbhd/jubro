import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkspaceLink, getRequestedBoardView, isInsightsPage } from '../js/main/insights/navigation.js';

test('workspace navigation preserves tracker IDs and only accepts known explicit views', () => {
  assert.equal(getWorkspaceLink('a b&c', 'insights'), '/dashboard/?tracker=a+b%26c');
  assert.equal(getWorkspaceLink('two', 'kanban'), '/board/?tracker=two&view=kanban');
  assert.equal(getWorkspaceLink('two', 'list'), '/board/?tracker=two&view=list');
  assert.equal(getRequestedBoardView('?view=list'), 'list');
  assert.equal(getRequestedBoardView('?view=kanban'), 'kanban');
  assert.equal(getRequestedBoardView('?view=other'), null);
  assert.equal(isInsightsPage('/dashboard/'), true);
  assert.equal(isInsightsPage('/dashboard'), true);
  assert.equal(isInsightsPage('/board/'), false);
});
