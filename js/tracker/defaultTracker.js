export function createDefaultTracker(id, title = 'Job Applications') {
  const today = new Date().toISOString().slice(0, 10);

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
    rows: [
      [
        { value: 'Google', type: 'text' },
        { value: 'Frontend Intern', type: 'text' },
        { value: 'LinkedIn', type: 'select' },
        { value: 'Applied', type: 'select' },
        { value: today, type: 'date' },
        { value: 'https://careers.google.com', type: 'text' }
      ],
      [
        { value: 'Microsoft', type: 'text' },
        { value: 'Software Engineer', type: 'text' },
        { value: 'Indeed', type: 'select' },
        { value: 'Interview', type: 'select' },
        { value: today, type: 'date' },
        { value: 'https://careers.microsoft.com', type: 'text' }
      ],
      [
        { value: 'Meta', type: 'text' },
        { value: 'Web Developer', type: 'text' },
        { value: 'JobStreet', type: 'select' },
        { value: 'Rejected', type: 'select' },
        { value: today, type: 'date' },
        { value: 'https://www.metacareers.com', type: 'text' }
      ]
    ]
  };
}
