(function(g){'use strict';
const S=g.Store;
function schedule(){
  const st=S.state,days=S.activeDays(),mods=S.modules();
    if(!days.length||!mods.length)return{ok:false,error:'La malla escolar no tiene días o módulos válidos.'};
  const dayN=days.length,modN=mods.length;
  const 
    grids={
      groups:{},
      teachers:{},
      rooms:{}
    },
    teacherLoad={},
    teacherDay={},
    roomLoad={},
    missing=[];
    st.groups.forEach(x=>grids.groups[x.id]=matrix(dayN,modN));
    st.teachers.forEach(x=>{grids.teachers[x.id]=matrix(dayN,modN);
    teacherLoad[x.id]=0;
    teacherDay[x.id]=Array(dayN).fill(0)});
    st.rooms.forEach(x=>{grids.rooms[x.id]=matrix(dayN,modN);
    roomLoad[x.id]=0});
  const teacherFor={};
    st.subjects.forEach(sub=>{const candidates=st.teachers.filter(t=>(t.subjects||[]).includes(sub.id));
      if(candidates.length)candidates.sort((a,b)=>(a.name||'').localeCompare(b.name||'')),teacherFor[sub.id]=candidates[0].id});
  const mergedMap={},tasks=[];
  st.merges.forEach(m=>{const valid=(m.groups||[]).filter(id=>st.groups.some(x=>x.id===id));
    if(valid.length>=2){
      const key=m.subjectId+'|'+valid.slice().sort().join(',');mergedMap[key]=true;
      const req=Math.max(...valid.map(id=>{
        const gr=st.groups.find(x=>x.id===id);
        const x=(gr.subjects||[]).find(q=>q.subjectId===m.subjectId);
        return S.hoursToModules(x?x.hours:0)
      }));
      tasks.push({
        key,subjectId:m.subjectId,groups:valid,needed:req,merge:true
      })}});
  st.groups.forEach(gr=>(gr.subjects||[]).forEach(gs=>{
    const inMerge=st.merges.some(m=>m.subjectId===gs.subjectId&&(m.groups||[]).includes(gr.id));
    if(!inMerge)tasks.push({
      key:gs.subjectId+'|'+gr.id,
      subjectId:gs.subjectId,
      groups:[gr.id],
      needed:S.hoursToModules(gs.hours),
      merge:false
    })}));
  tasks.forEach(t=>{
    t.teacherId=teacherFor[t.subjectId]||null;
    t.students=t.groups.reduce((a,id)=>a+(+(st.groups.find(x=>x.id===id)||{}).students||0),0);
    t.options=countOptions(t)
  });
  tasks.sort((a,b)=>(!a.teacherId)-(!b.teacherId)||a.options-b.options||b.students-a.students||b.needed-a.needed);
  const placedByTask={};
  tasks.forEach(task=>{
    placedByTask[task.key]=[];
    if(!task.teacherId){
      missing.push(miss(task,task.needed,'No hay un docente asignable para esta materia.'));
      return
    }
    for(let n=0;n<task.needed;n++){
      const candidates=[];
      for(let di=0;di<dayN;di++)for(let mi=0;mi<modN;mi++){
        if(mods[mi].break)continue;
        const roomChoices=availableRooms(task,di,mi);
        roomChoices.forEach(room=>{
          if(valid(task,room,di,mi,placedByTask[task.key]))candidates.push({
            di,mi,room,score:score(task,room,di,mi,placedByTask[task.key])
          })
        });
      }
      candidates.sort((a,b)=>a.score-b.score||a.di-b.di||a.mi-b.mi);
        if(!candidates.length){
        missing.push(miss(task,task.needed-n,'No existe una combinación libre que cumpla disponibilidad, capacidad y continuidad.'));
        break}
        place(task,candidates[0]);
        placedByTask[task.key].push(candidates[0]);
    }
  });
const summary={};
  st.groups.forEach(gr=>{
    const rows=[];
    let occupied=0;
    (gr.subjects||[]).forEach(gs=>{
      const sub=st.subjects.find(x=>x.id===gs.subjectId);
      const teacher=st.teachers.find(x=>x.id===teacherFor[gs.subjectId]);
      const rooms=new Set();
      let count=0;
      (grids.groups[gr.id]||[]).forEach(col=>col.forEach(c=>{
        if(c&&c.subjectId===gs.subjectId){
          count++;rooms.add((st.rooms.find(x=>x.id===c.roomId)||{}).name||'')
        }
      }));
      rows.push({
        subject:sub?.name||'',
        code:sub?.code||'',
        color:sub?.color||'#777',
        teacher:teacher?.name||'Sin docente',
        requested:S.hoursToModules(gs.hours),
        assigned:count,
        hours:+gs.hours||0,
        rooms:[...rooms],
        shared:st.merges.some(m=>m.subjectId===gs.subjectId&&(m.groups||[]).includes(gr.id))
      });
        occupied+=count});
        summary[gr.id]={rows,free:dayN*mods.filter(x=>!x.break).length-occupied}
  });
return{
  ok:true,days,
  modules:mods,grids,summary,teacherLoad,teacherFor,missing,
  total:tasks.reduce((a,t)=>a+t.needed,0)-missing.reduce((a,x)=>a+x.modules,0)
};
function matrix(d,m){
  return Array.from({length:d},()=>Array(m).fill(null))
}
function countOptions(t){
  if(!t.teacherId)return 0;
  let c=0;for(let di=0;di<dayN;di++)
    for(let mi=0;mi<modN;mi++)
      if(!mods[mi].break)c+=availableRooms(t,di,mi).length;
  return c
}
function availability(t,di,mi){
  const a=t.availability||{};
  const arr=a[days[di].id];
  return Array.isArray(arr)?arr[mi]!==false:true
}
function availableRooms(task,di,mi){
  const sub=st.subjects.find(x=>x.id===task.subjectId)||{};
  const group=st.groups.find(x=>x.id===task.groups[0])||{};
  return st.rooms.filter(r=>(+r.capacity||0)>=task.students&&(!sub.space||r.type===sub.space)&&!grids.rooms[r.id][di][mi]).sort((a,b)=>{
    const abase=a.id===group.roomId?-25:0,bbase=b.id===group.roomId?-25:0;
    return ((+a.capacity||999)-task.students)+abase-(((+b.capacity||999)-task.students)+bbase)
  })
}
function valid(task,room,di,mi,already){
  const teacher=st.teachers.find(x=>x.id===task.teacherId);
  if(!availability(teacher,di,mi)||grids.teachers[task.teacherId][di][mi])return false;
  if((teacherDay[task.teacherId][di]||0)>=(+teacher.dayMax||999)||(teacherLoad[task.teacherId]||0)>=(+teacher.weekMax||999))return false;
  for(const gid of task.groups)if(grids.groups[gid][di][mi])return false;
  const sub=st.subjects.find(x=>x.id===task.subjectId)||{};
  const limit=+sub.maxContinuous||+st.school.maxContinuous||2;
  for(const gid of task.groups){
    let run=1;
    for(let x=mi-1;x>=0;x--){
      const c=grids.groups[gid][di][x];
      if(c&&c.subjectId===task.subjectId)run++;
      else break
    }
    for(let x=mi+1;x<modN;x++){
      const c=grids.groups[gid][di][x];
      if(c&&c.subjectId===task.subjectId)run++;
      else break
    }
    if(run>limit)return false
  }
  return true
}
function score(task,room,di,mi,already){
  let sc=0;
  const sameDay=already.filter(x=>x.di===di).length;
  sc+=sameDay*18;
  sc+=teacherDay[task.teacherId][di]*3;
  sc+=roomLoad[room.id]*.12;
  sc+=(room.capacity-task.students)*.04;
  const group=st.groups.find(x=>x.id===task.groups[0]);
  if(group?.roomId===room.id)sc-=8;
  for(const gid of task.groups){
    const row=grids.groups[gid][di];
    const before=row.slice(0,mi).some(Boolean),after=row.slice(mi+1).some(Boolean);
    if(before&&after)sc-=8;
    else if(before||after)sc-=3;
    else sc+=2
  }
  const daily=Array.from({length:dayN},(_,d)=>already.filter(x=>x.di===d).length);
  sc+=(daily[di]-Math.min(...daily))*12;
  sc+=Math.random()*.1;
  return sc
}
function place(task,x){
  const sub=st.subjects.find(y=>y.id===task.subjectId);
  const cell={
    key:task.key,
    subjectId:task.subjectId,
    teacherId:task.teacherId,
    roomId:x.room.id,
    groups:task.groups.slice(),
    merge:task.merge
  };
  task.groups.forEach(id=>grids.groups[id][x.di][x.mi]=cell);
  grids.teachers[task.teacherId][x.di][x.mi]=cell;
  grids.rooms[x.room.id][x.di][x.mi]=cell;
  teacherLoad[task.teacherId]++;
  teacherDay[task.teacherId][x.di]++;
  roomLoad[x.room.id]++
}
function miss(task,n,reason){
  return{
    subject:(st.subjects.find(x=>x.id===task.subjectId)||{}).name||'Materia',
    groups:task.groups.map(id=>S.groupName(st.groups.find(x=>x.id===id)||{})).join(' + '),
    modules:n,
    hours:S.modulesToHours(n),reason
  }
}
}
  g.Scheduler={schedule};
}
)(window);
