/**
 * Cloudflare Bulk Redirect Rules Setup — Account-Level API
 * Benötigt: Konto → Massen-URL-Weiterleitungen → Bearbeiten
 */

const TOKEN      = process.env.CF_TOKEN;
const ZONE_ID    = '7b8920fd98089a8c14e624c81c860a26';
const ACCOUNT_ID = '0a3df27551405cc8faef147c688fa7c7';
const SITE       = 'https://ethyria.at';
const BASE       = 'https://api.cloudflare.com/client/v4';

const h = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: h, body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json();
  if (!d.success) {
    console.error('API Fehler:', JSON.stringify(d.errors, null, 2));
    throw new Error(`${method} ${path} failed`);
  }
  return d.result;
}

// ── Alle Redirects ────────────────────────────────────────────────────────────

const SYMBOL_SLUGS = [
  'auto-unfall','ex-partner','fallen','fliegen','haus-raeume',
  'hunde-katzen','nackt-sein','pruefung','schlangen','schwangerschaft',
  'spinnen','tod','verfolgt-werden','wasser','zaehne-verlieren',
];
const LANGS = ['en','fr','es','ru'];

const items = [
  // Symbol Hub Sprachversionen (alte Struktur /symbols/en/ → /en/symbols/)
  ...LANGS.map(l => ({
    redirect: {
      source_url: `${SITE}/symbols/${l}/`,
      target_url: `${SITE}/${l}/symbols/`,
      status_code: 301,
      include_subdomains: false,
      subpath_matching: false,
      preserve_query_string: false,
    },
  })),

  // Symbol Detail .html → Clean URL (DE)
  ...SYMBOL_SLUGS.map(slug => ({
    redirect: {
      source_url: `${SITE}/symbols/${slug}.html`,
      target_url: `${SITE}/symbols/${slug}/`,
      status_code: 301,
      include_subdomains: false,
      subpath_matching: false,
      preserve_query_string: false,
    },
  })),

  // Symbol Detail .html → Clean URL (EN/FR/ES/RU)
  ...LANGS.flatMap(l =>
    SYMBOL_SLUGS.map(slug => ({
      redirect: {
        source_url: `${SITE}/symbols/${l}/${slug}.html`,
        target_url: `${SITE}/${l}/symbols/${slug}/`,
        status_code: 301,
        include_subdomains: false,
        subpath_matching: false,
        preserve_query_string: false,
      },
    }))
  ),

  // Pillar Pages
  ...['traumdeutung-methoden','traumsymbole-guide','luzides-traeumen'].flatMap(p => [
    { redirect: { source_url: `${SITE}/${p}.html`,    target_url: `${SITE}/${p}/`,    status_code: 301, include_subdomains: false, subpath_matching: false, preserve_query_string: false } },
    ...LANGS.map(l => ({ redirect: { source_url: `${SITE}/${p}.${l}.html`, target_url: `${SITE}/${l}/${p}/`, status_code: 301, include_subdomains: false, subpath_matching: false, preserve_query_string: false } })),
  ]),

  // Legal Pages
  ...['impressum','datenschutz'].flatMap(p => [
    { redirect: { source_url: `${SITE}/${p}.html`,    target_url: `${SITE}/${p}/`,    status_code: 301, include_subdomains: false, subpath_matching: false, preserve_query_string: false } },
    ...LANGS.map(l => ({ redirect: { source_url: `${SITE}/${p}.${l}.html`, target_url: `${SITE}/${l}/${p}/`, status_code: 301, include_subdomains: false, subpath_matching: false, preserve_query_string: false } })),
  ]),
  { redirect: { source_url: `${SITE}/agb.html`, target_url: `${SITE}/agb/`, status_code: 301, include_subdomains: false, subpath_matching: false, preserve_query_string: false } },
];

// ── Deploy ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Erstelle Bulk Redirect List mit ${items.length} Einträgen...\n`);

  // Prüfe ob Liste bereits existiert
  const lists = await api('GET', `/accounts/${ACCOUNT_ID}/rules/lists`);
  const existing = lists.find(l => l.name === 'ethyria-legacy');

  let listId;
  if (existing) {
    console.log(`  Liste "ethyria-legacy" existiert bereits (${existing.id}) — aktualisiere...`);
    // Alle bestehenden Items löschen
    const existingItems = await api('GET', `/accounts/${ACCOUNT_ID}/rules/lists/${existing.id}/items`);
    if (existingItems?.length > 0) {
      const ids = existingItems.map(i => ({ id: i.id }));
      const op = await api('DELETE', `/accounts/${ACCOUNT_ID}/rules/lists/${existing.id}/items`, { items: ids });
      await waitForOperation(op.operation_id);
    }
    listId = existing.id;
  } else {
    console.log('  Erstelle neue Liste "ethyria-legacy"...');
    const list = await api('POST', `/accounts/${ACCOUNT_ID}/rules/lists`, {
      name: 'ethyria-legacy',
      kind: 'redirect',
      description: 'Ethyria Astro Migration — Legacy URL Redirects',
    });
    listId = list.id;
    console.log(`  ✓ Liste erstellt: ${listId}`);
  }

  // Items hinzufügen
  console.log(`  Füge ${items.length} Redirects hinzu...`);
  const addOp = await api('POST', `/accounts/${ACCOUNT_ID}/rules/lists/${listId}/items`, items);
  await waitForOperation(addOp.operation_id);
  console.log(`  ✓ ${items.length} Einträge gespeichert`);

  // Bulk Redirect Rule in Zone aktivieren
  console.log('\nAktiviere Bulk Redirect Rule in Zone...');
  try {
    await api('PUT', `/zones/${ZONE_ID}/rulesets/phases/http_request_redirect/entrypoint`, {
      rules: [{
        action: 'redirect',
        action_parameters: { from_list: { name: 'ethyria-legacy', key: 'http.request.full_uri' } },
        expression: `http.request.full_uri in $ethyria-legacy`,
        description: 'Ethyria Astro legacy redirects',
        enabled: true,
      }],
    });
    console.log('  ✓ Zone Redirect Rule aktiv');
  } catch {
    // Free Plan: Zone-Phase nicht verfügbar → Account-Phase verwenden
    console.log('  Zone-Phase nicht verfügbar, versuche Account-Phase...');
    await api('PUT', `/accounts/${ACCOUNT_ID}/rulesets/phases/http_request_redirect/entrypoint`, {
      rules: [{
        action: 'redirect',
        action_parameters: { from_list: { name: 'ethyria-legacy', key: 'http.request.full_uri' } },
        expression: `http.request.full_uri in $ethyria-legacy`,
        description: 'Ethyria Astro legacy redirects',
        enabled: true,
      }],
    });
    console.log('  ✓ Account Redirect Rule aktiv');
  }

  console.log('\nFertig! Alle Redirects angelegt.');
  console.log('Testen (nach DNS-Umstellung):');
  console.log('  curl -sI https://ethyria.at/symbols/wasser.html | grep -i location');
  console.log('  curl -sI https://ethyria.at/traumdeutung-methoden.html | grep -i location');
}

async function waitForOperation(opId) {
  if (!opId) return;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    const op = await api('GET', `/accounts/${ACCOUNT_ID}/rules/lists/bulk_operations/${opId}`);
    if (op.status === 'completed') return;
    if (op.status === 'failed') throw new Error(`Operation ${opId} failed`);
  }
}

main().catch(err => { console.error('\nFehler:', err.message); process.exit(1); });
