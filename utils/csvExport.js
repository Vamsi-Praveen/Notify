export const jsonToCsv = (data, fields) => {
  const header = fields.join(',') + '\n';
  const rows = data
    .map((obj) => {
      return fields
        .map((field) => {
          let val = field.split('.').reduce((o, i) => o?.[i], obj) || '';
          // Escape quotes and commas
          if (
            typeof val === 'string' &&
            (val.includes(',') || val.includes('"') || val.includes('\n'))
          ) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',');
    })
    .join('\n');
  return header + rows;
};
