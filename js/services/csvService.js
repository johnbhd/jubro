export class CSVService {
  export(data, filename = "trackers.csv") {
    if (!data?.rows?.length) return;

    const headers = data.columns.map(col => col.name);

    const rows = data.rows.map(row =>
      row.map(cell => `"${cell.value ?? ''}"`).join(',')
    );

    const csv = [
      headers.join(','),
      ...rows
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  import(callback) {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.csv';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];

      if (!file) return;

      const text = await file.text();

      const lines = text.split('\n').filter(Boolean);

      const headers = lines[0]
        .split(',')
        .map(h => h.replace(/"/g, '').trim());

      const rows = lines.slice(1).map(line => {
        const values = line.split(',');

        return values.map(value => ({
          value: value.replace(/"/g, '').trim(),
          type: 'text'
        }));
      });

      callback({
        columns: headers.map(name => ({
          name,
          type: 'text'
        })),
        rows
      });
    });

    input.click();
  }
}