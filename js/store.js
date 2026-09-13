(function(g){'use strict';
const DAYS=[
    ['LU','Lunes'],
    ['MA','Martes'],
    ['MI','Miércoles'],
    ['JU','Jueves'],
    ['VI','Viernes'],
    ['SA','Sábado'],
    ['DO','Domingo']
];
const COLORS=[
    '#70a0ff',
    '#49d6a1',
    '#f1bd4e',
    '#c7afff',
    '#ff9e91',
    '#63d5e7',
    '#f4a261',
    '#8bd17c',
    '#e995c1',
    '#9eb7e8',
    '#d6b47a',
    '#9dc8ae'
];
const defaults=()=>({
    version:1,
    currentStep:0,
    school:{
        name:'',
        cycle:'',
        days:[
            'LU',
            'MA',
            'MI',
            'JU',
            'VI'
        ],
        start:'07:00',
        end:'14:00',
        duration:60,
        maxContinuous:2,
        breaks:[]
    },
    rooms:[],
    subjects:[],
    groups:[],
    teachers:[],
    merges:[],
    result:null
});
let state;
try{
    state=JSON.parse(localStorage.getItem('horarios.v1'))||defaults()
}
catch(e){
    state=defaults()
}
state=Object.assign(defaults(),state);
state.school=Object.assign(defaults().school,state.school||{});
function save(){
    try{
        localStorage.setItem('horarios.v1',JSON.stringify(state))
    }catch(e){} 
}
function reset(){
    state=defaults();
    save();
    return state
}
function setState(x){
    state=Object.assign(defaults(),x||{});
    state.school=Object.assign(defaults().school,state.school||{});
    save();
    return state
}
function id(prefix){
    return prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)
}
function minutes(v){
    const p=String(v||'0:0').split(':').map(Number);
    return p[0]*60+p[1]
}
function hhmm(n){
    n=(n+1440)%1440;
    return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')
}
function modules(){
    const 
    a=[],
    s=minutes(state.school.start),
    e=minutes(state.school.end),
    d=+state.school.duration||60;if(e<=s||d<=0)return a;
    for(
        let 
        t=s,i=0;
        t+d<=e;
        t+=d,i++
    )
    a.push({
        i,
        start:hhmm(t),
        end:hhmm(t+d),
        label:hhmm(t)+' - '+hhmm(t+d),
        break:(state.school.breaks||[]).includes(i)
    });
    return a
}
function activeDays(){
    return DAYS.filter(d=>(state.school.days||[]).includes(d[0])).map(d=>({id:d[0],name:d[1]}))
}
const by=(key,id)=>state[key].find(x=>x.id===id);
function hoursToModules(h){
    return Math.ceil((Number(h)||0)*60/(+state.school.duration||60))
}
function modulesToHours(n){
    return +(n*(+state.school.duration||60)/60).toFixed(2)
}
function textColor(hex){
    const h=(hex||'#777').replace('#','');
    const r=parseInt(h.slice(0,2),16)||0,b=parseInt(h.slice(4,6),16)||0,gr=parseInt(h.slice(2,4),16)||0;
    return (r*299+gr*587+b*114)/1000>145?'#071015':'#f7f9fc'
}
function darken(hex,p=.55){
    const h=(hex||'#777777').replace('#','');
    const c=[0,2,4].map(i=>Math.round((parseInt(h.slice(i,i+2),16)||119)*p));
    return '#'+c.map(x=>x.toString(16).padStart(2,'0')).join('')
}
function groupName(x){
    return [x.code,x.degree].filter(Boolean).join(' · ')||'Grupo'
}
Object.defineProperty(g,'Store',{
    value:{get state(){
        return state
    },
    set state(v){
        state=v
    },
    DAYS,
    COLORS,
    defaults,
    save,
    reset,
    setState,
    id,
    minutes,
    hhmm,
    modules,
    activeDays,
    by,
    hoursToModules,
    modulesToHours,
    textColor,
    darken,
    groupName
}
});
})(window);
