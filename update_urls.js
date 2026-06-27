const fs = require('fs');
const files = [
  'packages/citizen-app/src/data/mockData.ts',
  'packages/backend/src/scripts/seed/seed-demo-issues.ts',
  'packages/authority-portal/src/screens/IssueDetailScreen.tsx'
];
let i = 1;
files.forEach(f => {
  try {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/https:\/\/images\.unsplash\.com\/[^'"`?]+\?[^'"`]+/g, () => 'https://picsum.photos/seed/civicsense' + (i++) + '/400/300');
    fs.writeFileSync(f, c);
    console.log('Updated ' + f);
  } catch (err) {
    console.error('Failed ' + f + ': ' + err.message);
  }
});
