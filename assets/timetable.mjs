export function showDeadlines(root, lang) {

(function(){
  var rows = root.querySelectorAll('[data-due]');
  if (!rows.length) return;
  var today = new Date(); today.setHours(0,0,0,0);
  var ZH = lang !== 'en';
  rows.forEach(function(tr){
    var iso = tr.getAttribute('data-due');
    var parts = iso.split('-');
    var d = new Date(+parts[0], +parts[1]-1, +parts[2]);
    var days = Math.round((d - today) / 86400000);
    var slot = tr.querySelector('.due');
    if (!slot) return;
    // 「已过」有歧义：读起来像「你错过了」。改成「已结束」，只陈述事实。
    // 过期行也不再整行降透明度（36 行里 15 行已过，全灰像页面坏了）。
    // 范围型任务（有起止日期）在提示里说明这个数字算到哪一天，
    // 否则「还剩 117 天」看不出是算到 2/1 还是 2/12。
    var isSpan = tr.hasAttribute('data-span');
    function tail(days) {
      if (!isSpan) return '';
      return ZH ? '（算到 ' + (parts[1] * 1) + '/' + (parts[2] * 1) + '）'
                : ' (to ' + (parts[1] * 1) + '/' + (parts[2] * 1) + ')';
    }
    if (days < 0)   { slot.textContent = ZH ? '已结束' : 'past'; slot.className = 'due past'; }
    else if (days === 0) { slot.textContent = (ZH ? '就是今天' : 'today') + tail(days); slot.className = 'due soon'; }
    else if (days <= 14) { slot.textContent = (ZH ? '还剩 ' : 'in ') + days + (ZH ? ' 天' : 'd') + tail(days);
                           slot.className = 'due soon'; }
    else            { slot.textContent = (ZH ? '还剩 ' : 'in ') + days + (ZH ? ' 天' : 'd') + tail(days);
                      slot.className = 'due'; }
    if (days < 0) tr.classList.add('is-past');
  });
})();

}
