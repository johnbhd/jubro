export function createDefaultTracker(id, title = 'Job Applications') {
  return {
    id,
    title,
    columns: [
      { name: 'Company', type: 'text' },
      { name: 'Position', type: 'text' },
      {
        name: 'Platform',
        type: 'select',
        options: [
          { label: 'LinkedIn', color: '#0a66c2' },
          { label: 'JobStreet', color: '#2563eb' },
          { label: 'Indeed', color: '#4338ca' },
          { label: 'OnlineJobsPH', color: '#f59e0b' }
        ]
      },
      {
        name: 'Status',
        type: 'select',
        options: [
          { label: 'Applied', color: '#3b82f6' },
          { label: 'Interview', color: '#69df94' },
          { label: 'Rejected', color: '#ef4444' }
        ]
      },
      { name: 'Date', type: 'date' },
      { name: 'Link', type: 'text' }
    ],
    rows: []
  };
}
