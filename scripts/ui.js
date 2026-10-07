/* Presentation and interaction only. IndexedDB stores and API contracts are unchanged. */
const practicumActive = () => {
 const today=getLocalISOToday(), s=state.settings;
 return !!s.hasPracticum && (!s.periodStart || today>=s.periodStart) && (!s.periodEnd || today<=s.periodEnd);
};
function renderConsultation(container) {
 setTitle('Consulta','Herramientas clínicas');
 container.innerHTML=UIHelpers.section('Consulta rápida')+`<div class="list">${[
 ['CIMA','Medicamentos y fichas técnicas','medSearch'],['Patologías','Buscador CIE-11','diseaseSearch'],
 ['Calculadoras','Dosis, ritmos y otras fórmulas','calculators'],['Analíticas','Valores de referencia','labs'],
 ['Diccionario','Conceptos y abreviaturas','dictionary']
 ].map(([title,sub,view])=>UIHelpers.listRow({title,sub,icon:'▤',action:`data-action="openSlide" data-view="${view}"`})).join('')}</div>`+UIHelpers.clinicalWarning();
}
const ClinicalUI=(()=>{
 const iconPaths={
  hospital:'M3 21V3h18v18M9 7h6m-3-3v6M7 14h2m6 0h2M9 21v-4h6v4',
  person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  palette:'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5a3 3 0 0 0 3-3 9 9 0 0 0-9-7M7 8h.01M11 6h.01M16 8h.01M6 13h.01',
  lock:'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4',
  save:'M4 3h13l4 4v14H3V3h1M7 3v6h10V3M7 21v-8h10v8',
  book:'M4 3h7a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H4zM14 6a3 3 0 0 1 3-3h4v15h-4a3 3 0 0 0-3 3',
  check:'m4 12 5 5L20 6', plus:'M12 4v16M4 12h16', calendar:'M3 5h18v16H3zM7 2v6M17 2v6M3 10h18',
  tool:'m4 4 16 16M14 3a5 5 0 0 0 7 7L9 22l-7-7L14 3',
  star:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'
 };
 const emojiIcons={'🏥':'hospital','🩺':'hospital','👤':'person','🎨':'palette','🔒':'lock','💾':'save','📅':'calendar','📋':'book','➕':'plus'};
 const svg=name=>`<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[name]||iconPaths.book}"/></svg>`;
 const writeViews=new Set(['caseForm','classForm','dayLog','shiftForm','eirSimulator','settingsProfile','settingsPracticum','settingsTheme','settingsPrivacy']);
 const writeActions=new Set(['deleteClass','deleteShift','deleteEx','cancelClassDate','deleteTask','deleteCase','deleteMed','deleteCard','createCardFromTag','toggleFavorite','toggleStar','toggleProcFav']);
 const writeIds=new Set(['saveNursingNotes','saveMedLocal','saveTheme','savePrivacy','savePriv','setupAutoBackupBtn','importBtn','wipeBtn','syncFestivosBtn','addScheduleSlot','startEirAttempt','finishEirAttempt','autoBackupBtn','setupBackupBtn']);
 const writeForms=new Set(['caseForm','classForm','dayForm','shiftForm','taskForm','flashForm','exceptionForm','profForm','pracForm','privacyForm']);
 let serial=0, focusOrigins=new Map(), oldPanel=null, oldView=null;
 const attr=(el,k,v)=>{if(el.getAttribute(k)!==v)el.setAttribute(k,v);};
 const setInert=(el,v)=>{if(el && el.inert!==v)el.inert=v;};
 function isWrite(el) {
  return el.matches('[data-task],[data-r],#warnSel,#themeSel,[data-remove-schedule-slot],[data-eir-answer],[data-eir-flag]') || writeIds.has(el.id) || writeActions.has(el.dataset.action) ||
   (el.dataset.action==='openSlide' && writeViews.has(el.dataset.view)) ||
   (el.matches('button') && el.closest('form') && !el.hasAttribute('type') && el.closest('form').id!=='calcExec') ||
   (el.type==='submit' && el.closest('form') && el.closest('form').id!=='calcExec');
 }
 function enhance(root=document) {
  root.querySelectorAll('[data-ui-class]').forEach(el=> {el.classList.add(el.dataset.uiClass);el.removeAttribute('data-ui-class');});
  root.querySelectorAll('svg').forEach(el=>{attr(el,'aria-hidden','true');attr(el,'focusable','false');});
  root.querySelectorAll('.avatar,.ico').forEach(el=>{
   const t=el.textContent.trim(); if(emojiIcons[t])el.innerHTML=svg(emojiIcons[t]);
  });
  // Replace decorative/operational emojis without changing labels or data values.
  root.querySelectorAll('button,strong,h1,h2,h3,h4,.empty-state>div').forEach(el=>{
   for(const child of [...el.childNodes]) if(child.nodeType===Node.TEXT_NODE) {
    const text=child.textContent; const rx=/[🏥🩺👤🎨🔒💾📅📋➕]/u;
    if(!rx.test(text))continue;
    const frag=document.createDocumentFragment();let rest=text;
    for(const [emoji,name] of Object.entries(emojiIcons)) {
     if(!rest.includes(emoji))continue;
     const parts=rest.split(emoji); rest=parts.join('');
     const span=document.createElement('span');span.className='inline-icon';span.innerHTML=svg(name);frag.append(span);
    }
    frag.append(document.createTextNode(rest));child.replaceWith(frag);
   }
  });
  root.querySelectorAll('input:not([type=hidden]),select,textarea').forEach(el=>{
   if(el.closest('label'))return;
   if(!el.id)el.id=`ui-field-${++serial}`;
   const prev=el.previousElementSibling;
   let label=prev?.tagName==='LABEL'?prev:null;
   if(!label && el.parentElement?.previousElementSibling?.tagName==='LABEL' && el.parentElement.querySelectorAll('input,select,textarea').length===1) label=el.parentElement.previousElementSibling;
   if(label && !label.querySelector('input,select,textarea')) {attr(label,'for',el.id); if(!label.classList.contains('form-label'))label.classList.add('form-label');}
   if(!label && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
    attr(el,'aria-label',({areaFilterSelect:'Filtrar casos por área',gSearchQ:'Buscar en tus datos',filterQ:'Buscar concepto',cimaQ:'Buscar medicamento',icdQ:'Buscar patología',scanManual:'Código nacional'}[el.id]) || el.placeholder || ({procId:'Técnica',participation:'Participación',icd:'Código CIE-11'}[el.name]) || el.name || 'Valor');
   }
   if(el.matches('[required]'))attr(el,'aria-required','true');
  });
  root.querySelectorAll('.btn.icon-only').forEach(el=>{
   if(!el.getAttribute('aria-label'))attr(el,'aria-label',el.title || ({calPrev:'Periodo anterior',calNext:'Periodo siguiente',deleteTask:'Eliminar tarea',deleteCard:'Eliminar tarjeta',closeSlideOver:'Volver'}[el.dataset.action]) || el.textContent.trim() || 'Abrir');
  });
  root.querySelectorAll('[data-action]:not(button):not(a)').forEach(el=>{
   attr(el,'role','button');attr(el,'tabindex','0');
   if(el.dataset.action==='calSelect') {
    attr(el,'aria-label',`${dateFmt(el.dataset.val)}${el.classList.contains('today')?', hoy':''}`);
    attr(el,'aria-pressed',String(el.classList.contains('selected')));
   }
  });
  root.querySelectorAll('.calendar-cell .dot').forEach(el=> {
   const label=el.classList.contains('class')?'Clase':el.classList.contains('task')?'Tarea':'Excepción';
   attr(el,'role','img');attr(el,'aria-label',label);
  });
  root.querySelectorAll('.notice').forEach(el=>{if(!el.hasAttribute('role'))attr(el,'role','status');});
  // Read-only: block writes via controls and capture handlers; consultation remains available.
  root.querySelectorAll('button,input,select,textarea,[data-action]').forEach(el=>{
   if(isWrite(el)) {
    if(state.readOnlyMode) {
     if(!el.hasAttribute('data-readonly-blocked')) {attr(el,'data-readonly-blocked',el.disabled?'disabled':'enabled');el.disabled=true;attr(el,'aria-disabled','true');}
    } else if(el.hasAttribute('data-readonly-blocked')) {
     el.disabled=el.dataset.readonlyBlocked==='disabled';el.removeAttribute('data-readonly-blocked');el.removeAttribute('aria-disabled');
    }
   }
   if(el.closest('form') && writeForms.has(el.closest('form').id) && !el.matches('button')) {
    if(state.readOnlyMode && !el.hasAttribute('data-readonly-field')) {attr(el,'data-readonly-field',el.disabled?'disabled':'enabled');el.disabled=true;}
    else if(!state.readOnlyMode && el.hasAttribute('data-readonly-field')) {el.disabled=el.dataset.readonlyField==='disabled';el.removeAttribute('data-readonly-field');}
   }
  });
  root.querySelectorAll('[data-action="toggleGloves"]').forEach(el=>attr(el,'aria-pressed',String(state.settings.glovesMode)));
  root.querySelectorAll('[data-action="toggleReadOnly"]').forEach(el=>attr(el,'aria-pressed',String(state.readOnlyMode)));
  root.querySelectorAll('.nav-item').forEach(el=>{if(el.dataset.route===state.route)attr(el,'aria-current','page'); else if(el.hasAttribute('aria-current'))el.removeAttribute('aria-current');});
  root.querySelectorAll('#icdAutocomplete button').forEach((el,i)=> {
   attr(el,'role','option');attr(el,'id',`icd-option-${i}`);attr(el,'tabindex','-1');if(!el.hasAttribute('aria-selected'))attr(el,'aria-selected','false');
  });
  const combo=document.getElementById('caseDiagnosis'), list=document.getElementById('icdAutocomplete');
  if(combo && list) {const visible=getComputedStyle(list).display!=='none' && !!list.querySelector('[role=option]');attr(combo,'aria-expanded',String(visible));if(!visible)combo.removeAttribute('aria-activedescendant');}
  const calc=document.getElementById('calcExec');
  if(calc)calc.querySelectorAll('input').forEach(el=>{const label=document.querySelector(`label[for="${el.id}"]`);if(label&&!el.getAttribute('aria-describedby')) {const units=label.textContent.match(/\(([^)]+)\)/);if(units){const help=document.createElement('span');help.id=`${el.id}-unit`;help.className='form-help';help.textContent=`Unidad: ${units[1]}`;el.after(help);attr(el,'aria-describedby',help.id);}}});
 }
 const visibleFocus=root=>[...root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(el=>!el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
 function activePanel(){
  if(!$('#appLock').classList.contains('hidden'))return $('#appLock');
  if(!$('#onboardingView').classList.contains('hidden'))return $('#onboardingView');
  if($('#modalOverlay').classList.contains('open'))return $('#modalOverlay');
  if($('#slideOver').classList.contains('open'))return $('#slideOver');
  return null;
 }
 function syncPanels(){
  const panel=activePanel();
  for(const el of [$('.topbar'),$('#app'),$('#bottomNav'),$('#slideOver'),$('#modalOverlay'),$('#onboardingView')])setInert(el,!!panel && el!==panel);
  if(!panel){setInert($('#slideOver'),true);setInert($('#modalOverlay'),true);}
  const view=panel?.id==='slideOver'?state.slideOverView:null;
  if(panel!==oldPanel || view!==oldView) {
   const previous=oldPanel;
   if(panel && !focusOrigins.has(panel))focusOrigins.set(panel,document.activeElement);
   oldPanel=panel;oldView=view;
   if(panel)requestAnimationFrame(()=> {
    if(activePanel()!==panel)return;
    const target=panel.querySelector('#gSearchQ,#icdQ,#cimaQ,[autofocus]') || visibleFocus(panel)[0] || panel;
    target.focus({preventScroll:true});
   });
   else if(previous) {
    const origin=focusOrigins.get(previous);focusOrigins.delete(previous);
    if(origin?.isConnected && !origin.closest('[inert]'))origin.focus({preventScroll:true}); else $('#app').focus({preventScroll:true});
   }
   // Closing a modal above slide-over restores modal origin inside the lower panel.
   if(previous && panel && previous!==panel && !previous.classList.contains('open') && focusOrigins.has(previous)) {
    const origin=focusOrigins.get(previous);focusOrigins.delete(previous);
    if(origin?.isConnected && panel.contains(origin))requestAnimationFrame(()=>origin.focus({preventScroll:true}));
   }
  }
  document.body.classList.toggle('panel-open',!!panel);
  if(panel && !panel.contains(document.activeElement))requestAnimationFrame(()=>{if(activePanel()===panel && !panel.contains(document.activeElement))(panel.querySelector('#gSearchQ,#icdQ,#cimaQ') || visibleFocus(panel)[0] || panel).focus({preventScroll:true});});
 }
 document.addEventListener('invalid',e=>{
  const field=e.target;if(!field.matches('input,select,textarea'))return;
  if(!field.id)field.id=`ui-field-${++serial}`;
  attr(field,'aria-invalid','true');const id=`${field.id}-error`;let error=document.getElementById(id);
  if(!error){error=document.createElement('span');error.id=id;error.className='form-error';field.after(error);}
  error.textContent=field.validationMessage;
  const refs=new Set((field.getAttribute('aria-describedby')||'').split(' ').filter(Boolean));refs.add(id);attr(field,'aria-describedby',[...refs].join(' '));
 },true);
 document.addEventListener('input',e=>{
  const field=e.target;if(!field.matches('input,select,textarea') || !field.validity.valid)return;
  field.removeAttribute('aria-invalid');const id=`${field.id}-error`;document.getElementById(id)?.remove();
  const refs=(field.getAttribute('aria-describedby')||'').split(' ').filter(x=>x&&x!==id);if(refs.length)attr(field,'aria-describedby',refs.join(' '));else field.removeAttribute('aria-describedby');
 });
 const deny=e=>{e.preventDefault();e.stopImmediatePropagation();UI.toast('Modo solo lectura: esta acción no está disponible.','info');};
 document.addEventListener('click',e=>{
  const el=e.target.closest('button,input,select,[data-action]');
  if(state.readOnlyMode && el && isWrite(el))deny(e);
 },true);
 document.addEventListener('submit',e=>{if(state.readOnlyMode && e.target.id!=='calcExec' && e.target.id!=='obForm')deny(e);},true);
 document.addEventListener('change',e=>{if(state.readOnlyMode && (isWrite(e.target) || e.target.id==='fileImport'))deny(e);},true);
 document.addEventListener('keydown',e=>{
  const combo=e.target.closest('#caseDiagnosis');
  if(combo) {
   const list=$('#icdAutocomplete');const options=[...list.querySelectorAll('[role=option]')];
   if(e.key==='Escape'){list.classList.add('hidden');combo.setAttribute('aria-expanded','false');combo.removeAttribute('aria-activedescendant');e.preventDefault();e.stopImmediatePropagation();return;}
   if(combo.getAttribute('aria-expanded')==='true' && options.length) {
    const current=options.findIndex(el=>el.getAttribute('aria-selected')==='true');
    if(e.key==='ArrowDown'||e.key==='ArrowUp') {
     e.preventDefault();const next=current<0 ? (e.key==='ArrowDown'?0:options.length-1) : (current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
     options.forEach((el,i)=>el.setAttribute('aria-selected',String(i===next)));combo.setAttribute('aria-activedescendant',options[next].id);options[next].scrollIntoView({block:'nearest'});return;
    }
    if(e.key==='Enter' && current>=0){e.preventDefault();options[current].click();combo.focus();return;}
   }
  }
  const panel=activePanel();
  if(panel && e.key==='Tab') {
   const items=visibleFocus(panel),first=items[0],last=items.at(-1);
   if(!items.length){e.preventDefault();panel.focus();}
   else if(e.shiftKey && (document.activeElement===first || !panel.contains(document.activeElement))){e.preventDefault();last.focus();}
   else if(!e.shiftKey && (document.activeElement===last || !panel.contains(document.activeElement))){e.preventDefault();first.focus();}
  }
  if(e.key==='Escape' && panel) {
   if(panel.id==='modalOverlay')($('#modCancel')||$('#modOk')||$('#closeModCima'))?.click();
   else if(panel.id==='slideOver')state.slideOverOpen=false;
   e.preventDefault();
  }
  const roleButton=e.target.closest('[role=button]:not(button)');
  if(roleButton && ['Enter',' '].includes(e.key)){e.preventDefault();roleButton.click();}
 },true);
 let pending=false; const dirtyRoots=new Set();
 const observer=new MutationObserver(records=> {for(const r of records) {const root=r.target.nodeType===1?r.target:r.target.parentElement;if(root)dirtyRoots.add(root);} if(pending)return;pending=true;queueMicrotask(()=>{pending=false;const roots=[...dirtyRoots];dirtyRoots.clear();for(const root of roots)if(root.isConnected)enhance(root);syncPanels();});});
 document.addEventListener('DOMContentLoaded',()=>{
  const skip=document.createElement('a');skip.href='#app';skip.className='skip-link';skip.textContent='Ir al contenido';document.body.prepend(skip);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  enhance();syncPanels();
 });
 return {enhance,syncPanels};
})();
