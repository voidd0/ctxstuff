// ctxstuff — free forever from vøiddo. https://voiddo.com/tools/ctxstuff/
// Legacy limits kept as pass-through stubs so the rest of the CLI keeps
// compiling. No daily cap, no file-count cap, no size cap. Go nuts.

function getUsage()        { return { date: new Date().toISOString().split('T')[0], operations: 0 }; }
function incrementOps()    { /* no-op */ }
function getRemainingOps() { return Number.POSITIVE_INFINITY; }
function getCurrentOps()   { return 0; }
function canOperate()      { return { allowed: true }; }
function checkFileLimit(count) { return { allowed: true, count }; }
function checkSizeLimit(size)  { return { allowed: true, size }; }
function getLimitStatus()  {
  return { tier: 'free-forever', unlimited: true, opsToday: 0, opsLimit: Infinity };
}

module.exports = {
  getUsage,
  incrementOps,
  getRemainingOps,
  getCurrentOps,
  canOperate,
  checkFileLimit,
  checkSizeLimit,
  getLimitStatus,
};
