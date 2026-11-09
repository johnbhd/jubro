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
      { name: 'Link', type: 'text' },
      {
        name: 'Work Setup',
        type: 'select',
        options: [
          { label: 'On-site', color: '#64748b' },
          { label: 'Hybrid', color: '#8b5cf6' },
          { label: 'Remote', color: '#10b981' }
        ]
      },
      {
        name: 'Employment Type',
        type: 'select',
        options: [
          { label: 'Full-time', color: '#3b82f6' },
          { label: 'Part-time', color: '#06b6d4' },
          { label: 'Internship', color: '#f59e0b' },
          { label: 'Contract', color: '#ec4899' },
          { label: 'Freelance', color: '#84cc16' },
          { label: 'Temporary', color: '#94a3b8' }
        ]
      },
      { name: 'Next Action', type: 'text' },
      { name: 'Next Action Date', type: 'date' }
    ],
    rows: []
  };
}
