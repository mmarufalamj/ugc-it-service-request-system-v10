import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://ugc_app:ugc%402026@localhost:5432/ugc_it_service'
});

await client.connect();
const result = await client.query('SELECT settings FROM system_settings LIMIT 1');
const settings = result.rows[0]?.settings;

if (settings) {
  const parsed = JSON.parse(settings);
  console.log('dailyQuotes structure:');
  console.log(JSON.stringify(parsed.dailyQuotes, null, 2).substring(0, 500));
  console.log('\nTotal quotes:', parsed.dailyQuotes?.length);
} else {
  console.log('No settings found');
}

await client.end();
