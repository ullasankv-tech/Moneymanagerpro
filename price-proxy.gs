/**
 * Money Manager Pro — share price service (Google Apps Script)
 *
 * WHY THIS EXISTS
 * A web app cannot read NSE / BSE / Yahoo pages directly: they refuse requests that come
 * from a browser. This small script runs on Google's servers (free), fetches the prices
 * for the symbols the app asks for, and hands them back as JSON.
 *
 * SET UP (about 5 minutes, needs a Google account)
 * 1. Open https://script.google.com  ->  New project.
 * 2. Delete the sample code and paste this whole file.
 * 3. (Optional) Change ACCESS_CODE below to any secret word. Enter the same word in the app
 *    under Investments -> Statement -> Settings -> "Access code". Leave it '' for no code.
 * 4. Click Deploy -> New deployment -> type "Web app".
 *      Execute as:      Me
 *      Who has access:  Anyone
 *    Click Deploy and approve the permission prompts.
 * 5. Copy the Web app URL (it ends in /exec) and paste it into the app as the
 *    "Price service address".
 * 6. After you ever change this code: Deploy -> Manage deployments -> edit -> New version.
 *
 * WHAT IS SENT
 * Only share symbols such as RELIANCE.NS. The app never sends quantities, rates or amounts.
 *
 * GOOD TO KNOW
 * - Prices come from Yahoo Finance's unofficial chart service. It is free, may be delayed
 *   by a few minutes, and Yahoo can change or block it without notice.
 * - Symbols: NSE shares end in .NS (RELIANCE.NS), BSE shares in .BO (500325.BO).
 * - Results are cached for 90 seconds so opening the statement repeatedly is quick.
 */

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
