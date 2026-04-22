// ctxstuff — free forever from vøiddo. https://voiddo.com/tools/ctxstuff/
// Upsell/nag infrastructure removed. Every exported function is a no-op
// so callers keep compiling without edits.

function maybeShowProTip(_command) {}
function maybeShowCrossPromo() {}
function showProFeatureUpsell(_feature, _description) {}
function showLimitExceeded(_limit, _reason) {}
function getHelpFooter() { return ''; }

module.exports = {
  maybeShowProTip,
  maybeShowCrossPromo,
  showProFeatureUpsell,
  showLimitExceeded,
  getHelpFooter,
};
