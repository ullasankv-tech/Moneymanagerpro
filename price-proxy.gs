var ACCESS_CODE = '';        // optional secret, must match the app's "Access code"
var MAX_SYMBOLS = 40;        // per request
var CACHE_SECONDS = 90;

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (ACCESS_CODE && p.token !== ACCESS_CODE) {
    return json_({ error: 'bad access code' });
  }
  var symbols = String(p.symbols || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s && /^[A-Za-z0-9&\-.^]+$/.test(s); })
    .slice(0, MAX_SYMBOLS);

  var cache = CacheService.getScriptCache();
  var out = {};
  symbols.forEach(function (sym) {
    var hit = cache.get('px_' + sym);
    if (hit) { out[sym] = JSON.parse(hit); return; }
    var q = fetchQuote_(sym);
    out[sym] = q;
    if (q) cache.put('px_' + sym, JSON.stringify(q), CACHE_SECONDS);
  });
  return json_(out);
}

function fetchQuote_(sym) {
  try {
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(sym) + '?interval=1d&range=1d';
    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.getResponseCode() !== 200) return null;
    var meta = JSON.parse(res.getContentText()).chart.result[0].meta;
    var price = Number(meta.regularMarketPrice);
    if (!(price > 0)) return null;
    return {
      price: price,
      prevClose: Number(meta.chartPreviousClose) || null,
      time: meta.regularMarketTime || null,
      currency: meta.currency || null
    };
  } catch (err) {
    return null;
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
