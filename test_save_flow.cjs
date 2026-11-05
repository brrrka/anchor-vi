const fs = require('fs');
const assert = require('assert');
const source = fs.readFileSync(__dirname+'/src/App.jsx','utf8');
const chunk = source.slice(source.indexOf('  const handleSaveNewCase = (newCase) => {'), source.indexOf('  const toggleTheme ='));
function testSave({failFull = false, failAll = false} = {}) {
  let store = {}, currentCases=[], currentTab='', lastSaved='', note='', selectedCase={}, modalOpen=true;
  const localStorage = {setItem(key,value){if (failAll || (failFull && JSON.parse(value).some(c=>c.candidateEvents.length)))throw new Error('QuotaExceeded');store[key]=value;}};
  const cases=[];
  const setCases=v=>currentCases=v;
  const setSelectedCase=v=>selectedCase=v;
  const setIsUploadModalOpen=v=>modalOpen=v;
  const setLastSavedJobId=v=>lastSaved=v;
  const setActiveTab=v=>currentTab=v;
  const setSaveNotice=v=>note=v;
  const fn = new Function('cases','localStorage','setCases','setSelectedCase','setIsUploadModalOpen','setLastSavedJobId','setActiveTab','setSaveNotice',chunk+'return handleSaveNewCase;')(cases,localStorage,setCases,setSelectedCase,setIsUploadModalOpen,setLastSavedJobId,setActiveTab,setSaveNotice);
  const result={id:'KASUS-TEST',jobId:'job-34-mp4',analysisStatus:'no_candidate_contact',candidateEvents:[{event:1}],vehicleSpeedProfiles:[{points:[1,2,3]}],speedProfile:[{v1Speed:null}],matrix13:{crash_type_code:null}};
  if (failAll) {
    assert.throws(()=>fn(result),/Hasil belum tersimpan/);
    assert.equal(currentCases.length,0);
    return;
  }
  assert.equal(fn(result),true);
  assert.equal(JSON.parse(store.anchor_cases)[0].jobId,'job-34-mp4');
  assert.equal(currentCases.length,1);
  assert.equal(currentTab,'database');
  assert.equal(lastSaved,'job-34-mp4');
  assert.equal(selectedCase,null);
  assert.equal(modalOpen,false);
  assert(note.includes('tanpa kandidat kontak'));
  if (failFull) {
    assert.deepEqual(JSON.parse(store.anchor_cases)[0].candidateEvents,[]);
    assert(note.includes('ringkas'));
  }
}
testSave();testSave({failFull:true});testSave({failAll:true});
console.log('PASS: normal save, quota fallback, storage failure; no-contact is saveable; redirects to database');
