import { Chart, Gauge, Button } from '../../../src/ui/all.js';
const controls = [];
const theme = new Button('#theme',{text:'Light / dark',onClick:()=>{
  const dark = document.body.classList.toggle('dui-theme-dark-blue');
  document.body.classList.toggle('dui-theme-light-blue',!dark);
}});
controls.push(theme);
const rows = [{id:1,label:'Jan',sales:24,renewals:12},{id:2,label:'Feb',sales:38,renewals:18},{id:3,label:'Mar',sales:31,renewals:24},{id:4,label:'Apr',sales:48,renewals:21},{id:5,label:'May',sales:42,renewals:28}];
for (const [title,type,markers] of [['Basic','line',false],['Basic markers','line',true],['Spline','spline',false],['Spline markers','spline',true],['Column','column'],['Stacked column','stackedColumn'],['Stacked column 100%','stackedColumn100'],['Bar','bar'],['Gauge','gauge']]) {
  const section = document.createElement('section'), heading = document.createElement('h2'), host = document.createElement('div');
  heading.textContent=title; section.append(heading,host); document.querySelector('#charts').append(section);
  const control = type==='gauge' ? new Gauge(host,{label:'Capacity',width:300,value:68}) : new Chart(host,{label:title,type,markers,height:280,series:[{id:'sales',valueField:'sales',label:'Sales'},{id:'renewals',valueField:'renewals',label:'Renewals'}]});
  if (type!=='gauge') control.data.parse(rows);
  controls.push(control);
}
window.addEventListener('pagehide',()=>controls.forEach(control=>control.destroy()),{once:true});
