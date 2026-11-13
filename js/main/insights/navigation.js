export function isInsightsPage(pathname) {
  return /^\/dashboard\/?$/.test(pathname);
}

export function getRequestedBoardView(search) {
  const view = new URLSearchParams(search).get('view');
  return ['kanban', 'list'].includes(view) ? view : null;
}

export function getWorkspaceLink(trackerId, view) {
  const params = new URLSearchParams({ tracker: trackerId });
  if (view === 'insights') {
    return `/dashboard/?${params}`;
  }
  params.set('view', view === 'list' ? 'list' : 'kanban');
  return `/board/?${params}`;
}
