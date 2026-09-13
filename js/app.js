(function(){'use strict';
    const S=window.Store,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let step=Math.min(S.state.currentStep||0,7),editingGroup=null,editingTeacher=null,dragValue=null,view='groups',saveTimer;
    const steps=$$('.step');
function toast(msg,type=''){
    const el=$('#toast');
    el.textContent=msg;
    el.className='toast show '+type;
    clearTimeout(el._t);
    el._t=setTimeout(()=>el.className='toast',2800)
}
function changed(){
    S.state.result=null;
    S.save();
    $('#saveState').textContent='Guardado local · '+new Date().toLocaleTimeString('es-MX',{
        hour:'2-digit',
        minute:'2-digit'
    });
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>$('#saveState').textContent='Guardado local activo',1800)
}
function go(n){
    step=Math.max(0,Math.min(steps.length-1,n));
    S.state.currentStep=step;
    S.save();steps.forEach((x,i)=>x.hidden=i!==step);
    $$('.step-tab').forEach((x,i)=>{x.classList.toggle('active',i===step);
        x.classList.toggle('done',i<step);
        x.setAttribute('aria-current',i===step?'step':'false')});
        $('#progress').style.width=((step+1)/steps.length*100)+'%';
        $('#prev').disabled=step===0;
        $('#next').hidden=step===steps.length-1;
        $('#position').textContent=(step+1)+' de '+steps.length;
    if(step===6)renderValidation();
    if(step===7)renderPreview();
        scrollTo({
            top:0,
            behavior:'smooth'
        })
}
function buildNav(){
    const el=$('#steps');
    el.innerHTML=steps.map((x,i)=>`<button class="step-tab" type="button" data-step="${i}"><span class="step-num">${i+1}</span><span>${esc(x.dataset.title)}</span></button>`).join('');
    el.onclick=e=>{
        const b=e.target.closest('[data-step]');
        if(b)go(+b.dataset.step)
        }
}
function bindSchool(){
    const f={
        schoolName:'name',
        cycle:'cycle',
        startTime:'start',
        endTime:'end',
        duration:'duration',
        maxContinuous:'maxContinuous'
    };
    Object.entries(f).forEach(([id,key])=>{const el=$('#'+id);
        el.value=S.state.school[key];
        el.oninput=()=>{S.state.school[key]=['duration','maxContinuous'].includes(key)?+el.value:el.value;changed();
            if(['start','end','duration'].includes(key)){
                sanitizeAvailability();
                renderBreaks();
                renderAvailability()
            }
            renderGridSummary()
        }
    });
    $('#days').innerHTML=S.DAYS.map(d=>`<label class="chip"><input type="checkbox" value="${d[0]}" ${(S.state.school.days||[]).includes(d[0])?'checked':''}>${d[1]}</label>`).join('');
    $('#days').onchange=()=>{S.state.school.days=$$('#days input:checked').map(x=>x.value);
        changed();
        sanitizeAvailability();
        renderBreaks();
        renderAvailability();
        renderGridSummary()
    };
    renderBreaks();
    renderGridSummary()
}
function renderBreaks(){
    const mods=S.modules(),el=$('#breaks');
    S.state.school.breaks=(S.state.school.breaks||[]).filter(i=>i<mods.length);
    el.innerHTML=mods.length?mods.map(m=>`<label class="module-check"><input type="checkbox" value="${m.i}" ${m.break?'checked':''}>${m.label}</label>`).join(''):'<span class="empty">Configura un rango horario válido.</span>';
    el.onchange=()=>{S.state.school.breaks=$$('#breaks input:checked').map(x=>+x.value);
        changed();
        renderGridSummary();
        renderAvailability()
    }
}
function renderGridSummary(){
    const d=S.activeDays(),m=S.modules(),el=$('#gridSummary');
    if(!d.length||!m.length){el.className='notice error';
        el.innerHTML='<strong>Malla incompleta.</strong> Selecciona días y verifica que la hora final sea posterior a la inicial.';
        return
    }
    const useful=m.filter(x=>!x.break).length;el.className='notice ok';
    el.innerHTML=`<strong>Malla configurada:</strong> ${d.length} días × ${m.length} módulos de ${S.state.school.duration} min. Espacios útiles por grupo: <strong>${d.length*useful}</strong>; máximo ${S.state.school.maxContinuous} módulos continuos de una materia.`
}
function del(kind,id){
    if(!confirm('¿Eliminar este registro?'))return;
    S.state[kind]=S.state[kind].filter(x=>x.id!==id);
    if(kind==='subjects'){
        S.state.groups.forEach(g=>g.subjects=g.subjects.filter(x=>x.subjectId!==id));
        S.state.teachers.forEach(t=>t.subjects=t.subjects.filter(x=>x!==id));
        S.state.merges=S.state.merges.filter(x=>x.subjectId!==id)
    }
    if(kind==='groups')S.state.merges=S.state.merges.map(x=>({...x,groups:x.groups.filter(g=>g!==id)})).filter(x=>x.groups.length>=2);
    if(kind==='rooms')S.state.groups.forEach(g=>{if(g.roomId===id)g.roomId='' });
    changed();
    renderAll();
    toast('Registro eliminado.')
}
function bindRooms(){
    $('#roomForm').onsubmit=e=>{e.preventDefault();
        const name=$('#roomName').value.trim(),cap=+$('#roomCapacity').value;
        if(!name||cap<1)return toast('Completa nombre y capacidad.','error');
        S.state.rooms.push({
            id:S.id('room'),name,
            capacity:cap,
            type:$('#roomType').value
        });
        e.target.reset();
        changed();
        renderAll();
        toast('Aula agregada.','success')
    }
}
function renderRooms(){
    const el=$('#roomRows');
    el.innerHTML=S.state.rooms.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.capacity}</td><td>${esc(r.type)}</td><td><div class="row-actions"><button class="icon-btn delete" data-del-room="${r.id}" aria-label="Eliminar ${esc(r.name)}">×</button></div></td></tr>`).join('');
    el.onclick=e=>{
        const b=e.target.closest('[data-del-room]');
        if(b)del('rooms',b.dataset.delRoom)

    };
    $('#roomEmpty').hidden=S.state.rooms.length>0;
    $('#groupRoom').innerHTML='<option value="">Aula base automática</option>'+S.state.rooms.map(r=>`<option value="${r.id}">${esc(r.name)} · cap. ${r.capacity}</option>`).join('')
}
function bindSubjects(){
    $('#subjectForm').onsubmit=e=>{
        e.preventDefault();
        const name=$('#subjectName').value.trim();
        if(!name)return;
        S.state.subjects.push({
            id:S.id('sub'),name,
            code:$('#subjectCode').value.trim(),
            color:$('#subjectColor').value,
            space:$('#subjectSpace').value,
            maxContinuous:+$('#subjectMax').value||null
        });
        e.target.reset();
        $('#subjectColor').value=S.COLORS[S.state.subjects.length%S.COLORS.length];
        changed();
        renderAll();
        toast('Materia agregada.','success')
    }
}
function renderSubjects(){
    const el=$('#subjectRows');
    el.innerHTML=S.state.subjects.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.code||'—')}</td><td><i class="color-swatch" style="background:${s.color}"></i></td><td>${esc(s.space||'Cualquiera')}</td><td>${s.maxContinuous||'General'}</td><td><div class="row-actions"><button class="icon-btn delete" data-del-sub="${s.id}" aria-label="Eliminar ${esc(s.name)}">×</button></div></td></tr>`).join('');
    el.onclick=e=>{
        const b=e.target.closest('[data-del-sub]');
        if(b)del('subjects',b.dataset.delSub)
        };
    $('#subjectEmpty').hidden=S.state.subjects.length>0;renderPickers()
}
function renderPickers(){
    const gr=$('#groupSubjects');
    gr.innerHTML=S.state.subjects.length?S.state.subjects.map(s=>`<label class="subject-line"><input type="checkbox" value="${s.id}"><span><i class="color-swatch" style="background:${s.color}"></i> ${esc(s.name)}</span><input data-hours="${s.id}" type="number" min="0.25" step="0.25" value="2" aria-label="Horas semanales de ${esc(s.name)}"></label>`).join(''):'<div class="empty">Primero agrega materias.</div>';
    const ts=$('#teacherSubjects');
    ts.innerHTML=S.state.subjects.map(s=>`<label class="chip"><input type="checkbox" value="${s.id}"><i class="color-swatch" style="background:${s.color}"></i>${esc(s.name)}</label>`).join('');
    $('#mergeSubject').innerHTML='<option value="">Selecciona una materia</option>'+S.state.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')
}
function bindGroups(){
    $('#groupForm').onsubmit=e=>{e.preventDefault();
        const selected=$$('#groupSubjects input[type=checkbox]:checked').map(x=>({subjectId:x.value,hours:+$(`[data-hours="${x.value}"]`).value||0})).filter(x=>x.hours>0);
        if(!selected.length)return toast('Selecciona al menos una materia con horas.','error');
        const obj={
            id:editingGroup||S.id('group'),
            faculty:$('#groupFaculty').value.trim(),
            degree:$('#groupDegree').value.trim(),
            career:$('#groupCareer').value.trim(),
            code:$('#groupCode').value.trim(),
            students:+$('#groupStudents').value,
            roomId:$('#groupRoom').value,
            shift:$('#groupShift').value.trim(),
            subjects:selected
        };
        if(!obj.faculty||!obj.degree||!obj.career||!obj.code||obj.students<1)return toast('Completa los datos obligatorios del grupo.','error');
        if(!editingGroup&&S.state.groups.length>=30)return toast('Se alcanzó el máximo configurado de 30 grupos.','error');
        const idx=S.state.groups.findIndex(x=>x.id===editingGroup);
        if(idx>=0)S.state.groups[idx]=obj;
        else S.state.groups.push(obj);
        cancelGroup();
        changed();
        renderAll();
        toast(idx>=0?'Grupo actualizado.':'Grupo agregado.','success')
    };
    $('#cancelGroup').onclick=cancelGroup
}
function editGroup(id){
    const x=S.state.groups.find(g=>g.id===id);
    if(!x)return;editingGroup=id;
    $('#groupFaculty').value=x.faculty;
    $('#groupDegree').value=x.degree;
    $('#groupCareer').value=x.career;
    $('#groupCode').value=x.code;
    $('#groupStudents').value=x.students;
    $('#groupRoom').value=x.roomId||'';
    $('#groupShift').value=x.shift||'';
    $$('#groupSubjects input[type=checkbox]').forEach(c=>{
        const a=x.subjects.find(s=>s.subjectId===c.value);
        c.checked=!!a;if(a)$(`[data-hours="${c.value}"]`).value=a.hours
    });
    $('#cancelGroup').hidden=false;
    go(3)
}
function cancelGroup(){
    editingGroup=null;
    $('#groupForm').reset();
    $$('#groupSubjects [data-hours]').forEach(x=>x.value=2);
    $('#cancelGroup').hidden=true
}
function renderGroups(){
    const el=$('#groupCards');
    el.innerHTML=S.state.groups.map(x=>`<article class="record-card"><div><h3>${esc(S.groupName(x))}</h3><p>${esc(x.faculty)} · ${esc(x.career)} · ${x.students} alumnos</p><div class="tags">${x.subjects.map(q=>{
        const s=S.state.subjects.find(z=>z.id===q.subjectId);
        return `<span class="tag">${esc(s?.name||'Materia')} · ${q.hours} h</span>`
    }).join('')}</div></div><div class="row-actions"><button class="icon-btn" data-edit-group="${x.id}" aria-label="Editar grupo">✎</button><button class="icon-btn delete" data-del-group="${x.id}" aria-label="Eliminar grupo">×</button></div></article>`).join('');
    el.onclick=e=>{
        const ed=e.target.closest('[data-edit-group]'),de=e.target.closest('[data-del-group]');
        if(ed)editGroup(ed.dataset.editGroup);
        if(de)del('groups',de.dataset.delGroup)
        };
    $('#groupEmpty').hidden=S.state.groups.length>0;
    renderMergeGroups()
}
function emptyAvailability(){
    const o={};
    S.DAYS.forEach(d=>o[d[0]]=S.modules().map(()=>true));
    return o
}
function sanitizeAvailability(){
    const n=S.modules().length;
    S.state.teachers.forEach(t=>{
        t.availability=t.availability||{};
    S.DAYS.forEach(d=>{
        const old=t.availability[d[0]]||[];
        t.availability[d[0]]=Array.from({
            length:n
        },(_,i)=>old[i]!==false)
    })
    });
    S.save()
}
function renderAvailability(av){
    const days=S.activeDays(),mods=S.modules(),data=av||($('#teacherForm')._availability||emptyAvailability());
    $('#teacherForm')._availability=data;
    const el=$('#availability');
    if(!days.length||!mods.length){
        el.innerHTML='<div class="empty">Configura la malla de la escuela.</div>';
        return
    }
    el.innerHTML=`<table class="availability"><thead><tr><th>Hora</th>${days.map(d=>`<th>${d.name}</th>`).join('')}</tr></thead><tbody>${mods.map((m,mi)=>`<tr><td class="time">${m.label}</td>${days.map(d=>m.break?'<td><button class="slot-toggle" type="button" disabled>Receso</button></td>':`<td><button class="slot-toggle ${data[d.id]?.[mi]!==false?'on':''}" type="button" data-day="${d.id}" data-mod="${mi}">${data[d.id]?.[mi]!==false?'Sí':'No'}</button></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const set=(b,val)=>{data[b.dataset.day][+b.dataset.mod]=val;
        b.classList.toggle('on',val);
        b.textContent=val?'Sí':'No'};
        el.onpointerdown=e=>{
            const b=e.target.closest('[data-day]');
            if(!b)return;dragValue=!b.classList.contains('on');
            set(b,dragValue);
            b.setPointerCapture?.(e.pointerId);
            e.preventDefault()};
            el.onpointerover=e=>{
                if(dragValue===null)return;
                const b=e.target.closest('[data-day]');
                if(b)set(b,dragValue)
            };
        document.onpointerup=()=>dragValue=null
}
function bindTeachers(){
    $('#allAvailable').onclick=()=>renderAvailability(emptyAvailability());
    $('#noneAvailable').onclick=()=>{
        const a=emptyAvailability();
        Object.keys(a).forEach(k=>a[k]=a[k].map(()=>false));
        renderAvailability(a)};
        $('#teacherForm').onsubmit=e=>{
            e.preventDefault();
            const subjects=$$('#teacherSubjects input:checked').map(x=>x.value),name=$('#teacherName').value.trim();
            if(!name||!subjects.length)return toast('Escribe el nombre y selecciona materias.','error');
            const obj={
                id:editingTeacher||S.id('teacher'),name,subjects,
                dayMax:+$('#teacherDayMax').value||99,
                weekMax:+$('#teacherWeekMax').value||999,
                availability:JSON.parse(JSON.stringify(e.target._availability||emptyAvailability()))
            };
            const idx=S.state.teachers.findIndex(x=>x.id===editingTeacher);
            if(idx>=0)S.state.teachers[idx]=obj;
            else S.state.teachers.push(obj);
            cancelTeacher();
            changed();
            renderAll();
            toast(idx>=0?'Docente actualizado.':'Docente agregado.','success')
        };
        $('#cancelTeacher').onclick=cancelTeacher;
        renderAvailability()
}
function editTeacher(id){
    const x=S.state.teachers.find(t=>t.id===id);
    if(!x)return;
    editingTeacher=id;
    $('#teacherName').value=x.name;
    $('#teacherDayMax').value=x.dayMax;
    $('#teacherWeekMax').value=x.weekMax;
    $$('#teacherSubjects input').forEach(c=>c.checked=x.subjects.includes(c.value));
    renderAvailability(JSON.parse(JSON.stringify(x.availability)));
    $('#cancelTeacher').hidden=false;go(4)
}
function cancelTeacher(){
    editingTeacher=null;$('#teacherForm').reset();
    $('#teacherDayMax').value=6;
    $('#teacherWeekMax').value=30;
    $('#teacherForm')._availability=emptyAvailability();
    renderAvailability();
    $('#cancelTeacher').hidden=true
}
function renderTeachers(){
    const el=$('#teacherCards');
    el.innerHTML=S.state.teachers.map(x=>`<article class="record-card"><div><h3>${esc(x.name)}</h3><p>Máximo ${x.dayMax} módulos/día · ${x.weekMax} por semana</p><div class="tags">${x.subjects.map(id=>`<span class="tag">${esc(S.state.subjects.find(s=>s.id===id)?.name||'Materia')}</span>`).join('')}</div></div><div class="row-actions"><button class="icon-btn" data-edit-teacher="${x.id}" aria-label="Editar docente">✎</button><button class="icon-btn delete" data-del-teacher="${x.id}" aria-label="Eliminar docente">×</button></div></article>`).join('');
    el.onclick=e=>{
        const ed=e.target.closest('[data-edit-teacher]'),de=e.target.closest('[data-del-teacher]');
        if(ed)editTeacher(ed.dataset.editTeacher);
        if(de)del('teachers',de.dataset.delTeacher)
    };
    $('#teacherEmpty').hidden=S.state.teachers.length>0
}
function renderMergeGroups(){
    const sid=$('#mergeSubject').value;
    const eligible=sid?S.state.groups.filter(g=>g.subjects.some(x=>x.subjectId===sid)):S.state.groups;
    $('#mergeGroups').innerHTML=eligible.map(g=>`<label class="chip"><input type="checkbox" value="${g.id}">${esc(S.groupName(g))}</label>`).join('')||'<span class="empty">No hay grupos elegibles.</span>'
}
function bindMerges(){
    $('#mergeSubject').onchange=renderMergeGroups;
    $('#mergeForm').onsubmit=e=>{
        e.preventDefault();
        const subjectId=$('#mergeSubject').value,groups=$$('#mergeGroups input:checked').map(x=>x.value);
        if(!subjectId||groups.length<2)return toast('Selecciona una materia y al menos dos grupos.','error');
        S.state.merges.push({
            id:S.id('merge'),subjectId,groups
        });
        e.target.reset();
        changed();
        renderAll();
        toast('Sesión compartida agregada.','success')
    }
}
function renderMerges(){
    const el=$('#mergeCards');
    el.innerHTML=S.state.merges.map(x=>`<article class="record-card"><div><h3>${esc(S.state.subjects.find(s=>s.id===x.subjectId)?.name||'Materia')}</h3><p>${x.groups.map(id=>S.groupName(S.state.groups.find(g=>g.id===id)||{})).join(' + ')}</p></div><button class="icon-btn delete" data-del-merge="${x.id}" aria-label="Eliminar sesión">×</button></article>`).join('');
    el.onclick=e=>{
        const b=e.target.closest('[data-del-merge]');
        if(b)del('merges',b.dataset.delMerge)

    };
    $('#mergeEmpty').hidden=S.state.merges.length>0;
    renderMergeGroups()
}
function validations(){
    const st=S.state,checks=[];
    checks.push(['Malla semanal',S.activeDays().length>0&&S.modules().filter(x=>!x.break).length>0,'Selecciona días y un rango horario válido.']);
    checks.push(['Aulas',st.rooms.length>0,'Agrega al menos un aula.']);
    checks.push(['Materias',st.subjects.length>0,'Agrega al menos una materia.']);
    checks.push(['Grupos',st.groups.length>0,'Agrega al menos un grupo.']);
    checks.push(['Docentes',st.teachers.length>0,'Agrega al menos un docente.']);
    const noTeacher=st.subjects.filter(s=>st.groups.some(g=>g.subjects.some(x=>x.subjectId===s.id))&&!st.teachers.some(t=>t.subjects.includes(s.id)));
    checks.push(['Cobertura docente',noTeacher.length===0,noTeacher.length?'Sin docente: '+noTeacher.map(x=>x.name).join(', '):'Todas las materias tienen al menos un docente candidato.']);
    const capacity=st.groups.every(g=>st.rooms.some(r=>r.capacity>=g.students));
    checks.push(['Capacidad de aulas',capacity,'Algún grupo no cabe en ninguna aula.']);
    const mergeOk=st.merges.every(m=>m.groups.length>=2&&m.groups.every(id=>st.groups.find(g=>g.id===id)?.subjects.some(x=>x.subjectId===m.subjectId)));
    checks.push(['Materias compartidas',mergeOk,'Todos los grupos combinados deben tener asignada la materia.']);
    return checks
}
function renderValidation(){
    const v=validations();
    $('#validation').innerHTML=v.map(x=>`<div class="validation-item ${x[1]?'good':'bad'}"><span><strong>${esc(x[0])}</strong><br><small>${esc(x[1]?'Configuración válida.':x[2])}</small></span><span>${x[1]?'Correcto':'Revisar'}</span></div>`).join('');$('#generate').disabled=v.some(x=>!x[1])
}
function bindGenerate(){
    $('#generate').onclick=()=>{
        renderValidation();
        if(validations().some(x=>!x[1]))return toast('Corrige los puntos marcados antes de generar.','error');
        $('#generationResult').innerHTML='<div class="notice">Distribuyendo módulos y comprobando restricciones…</div>';
        setTimeout(()=>{
            const r=Scheduler.schedule();
            S.state.result=r;
            S.save();
            if(!r.ok){
                $('#generationResult').innerHTML=`<div class="notice error">${esc(r.error)}</div>`;
                return}$('#generationResult').innerHTML=`<div class="notice ${r.missing.length?'warning':'ok'}"><strong>${r.missing.length?'Horario parcial':'Horarios generados'}.</strong> ${r.total} módulos asignados${r.missing.length?`; ${r.missing.reduce((a,x)=>a+x.modules,0)} pendientes.`:'.'} <button class="btn primary small" id="seePreview" type="button">Ver vista previa</button></div>${r.missing.length?'<div class="notice warning">'+r.missing.map(x=>`<p><strong>${esc(x.subject)}</strong> · ${esc(x.groups)}: faltan ${x.modules} módulos. ${esc(x.reason)}</p>`).join('')+'</div>':''}`;
                $('#seePreview').onclick=()=>go(7);
                toast('Proceso terminado.',r.missing.length?'':'success')},30)
    }
}
function cellHTML(c,context){
    if(!c)return'<td class="free">Libre</td>';
    const sub=S.state.subjects.find(x=>x.id===c.subjectId)||{},te=S.state.teachers.find(x=>x.id===c.teacherId)||{},ro=S.state.rooms.find(x=>x.id===c.roomId)||{};
    let info=context==='teachers'?c.groups.map(id=>S.groupName(S.state.groups.find(x=>x.id===id)||{})).join(' + '):context==='rooms'?[c.groups.map(id=>S.groupName(S.state.groups.find(x=>x.id===id)||{})).join(' + '),te.name].filter(Boolean).join(' · '):te.name;
    return`<td><div class="class-cell" style="background:${S.darken(sub.color,.55)};color:${S.textColor(sub.color)}"><strong>${esc(sub.name)}${c.merge?' · compartida':''}</strong><span>${esc(info||'')}</span>${context!=='rooms'?`<span>${esc(ro.name||'')}</span>`:''}</div></td>`
}
function scheduleCard(title,meta,grid,context,res){
    return`<article class="schedule-card"><header class="schedule-head"><h2>${esc(title)}</h2><p>${esc(meta||'')}</p></header><div class="schedule-wrap"><table class="schedule"><thead><tr><th>Hora</th>${res.days.map(d=>`<th>${d.name}</th>`).join('')}</tr></thead><tbody>${res.modules.map((m,mi)=>`<tr><td class="time">${m.label}</td>${res.days.map((d,di)=>m.break?'<td class="break">RECESO</td>':cellHTML(grid?.[di]?.[mi],context)).join('')}</tr>`).join('')}</tbody></table></div></article>`
}
function renderPreview(){
    const res=S.state.result,el=$('#preview');
    $('#legend').innerHTML=S.state.subjects.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('');
    if(!res?.ok){
        el.innerHTML='<div class="empty"><strong>Aún no hay horarios generados.</strong><span>Ve a la sección Generar para crear la distribución.</span></div>';
        $('#exportXlsx').disabled=true;
        return
    }$('#exportXlsx').disabled=false;
        let html='';
        if(res.missing.length)html+='<div class="notice warning"><strong>Asignación parcial.</strong> El libro incluirá los módulos pendientes en la hoja Resumen.</div>';
        if(view==='groups')S.state.groups.forEach(x=>html+=scheduleCard(S.groupName(x),`${x.faculty} · ${x.career} · ${x.students} alumnos`,res.grids.groups[x.id],'groups',res));
        if(view==='teachers')S.state.teachers.forEach(x=>html+=scheduleCard(x.name,`${res.teacherLoad[x.id]||0} módulos · ${S.modulesToHours(res.teacherLoad[x.id]||0)} horas por semana`,res.grids.teachers[x.id],'teachers',res));
        if(view==='rooms')S.state.rooms.forEach(x=>html+=scheduleCard(x.name,`${x.type} · capacidad ${x.capacity}`,res.grids.rooms[x.id],'rooms',res));
        el.innerHTML=html||'<div class="empty">No hay registros para esta vista.</div>'
}
function bindPreview(){
    $$('.segmented button').forEach(b=>b.onclick=()=>{
        $$('.segmented button').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');view=b.dataset.view;renderPreview()
    });
        $('#exportXlsx').onclick=()=>{
            const r=Exporter.exportBook();
            toast(r.ok?`Libro creado: ${r.sheets} hojas.`:r.error,r.ok?'success':'error')
        }
}
function demo(){
    if((S.state.groups.length||S.state.rooms.length)&&!confirm('El ejemplo reemplazará los datos actuales. ¿Continuar?'))return;
    const st=S.defaults();
    st.school={
        name:'Instituto Tecnológico de Tlaxcala',
        cycle:'Otoño 2026',
        days:['LU','MA','MI','JU','VI'],
        start:'07:00',
        end:'14:00',
        duration:60,
        maxContinuous:2,
        breaks:[4]
    };
    st.rooms=[
        ['Aula A-101',45,'Aula'],
        ['Aula A-102',40,'Aula'],
        ['Aula A-103',38,'Aula'],
        ['Centro de cómputo',35,'Centro de cómputo'],
        ['Anexo',120,'Anexo']
    ].map(x=>({
        id:S.id('room'),
        name:x[0],
        capacity:x[1],
        type:x[2]})
    );
    const names=[
        ['Econometría I','ECO1','#70a0ff',''],
        ['Matemáticas Financieras','MATF','#f1bd4e',''],
        ['Contabilidad General','CON','#c7afff',''],
        ['Bases de Datos','BDD','#f4a261','Cómputo'],
        ['Ética Profesional','ETI','#49d6a1','Anexo'],
        ['Estadística II','EST2','#63d5e7','']
    ];
    st.subjects=names.map(x=>({
        id:S.id('sub'),
        name:x[0],
        code:x[1],
        color:x[2],
        space:x[3],
        maxContinuous:null
    }));
    const sm=(i,h)=>({
        subjectId:st.subjects[i].id,
        hours:h});
        st.groups=[{
            id:S.id('group'),
            faculty:'Ciencias Económico Administrativas',
            career:'Lic. en Finanzas',
            degree:'3er semestre',
            code:'3° A',
            students:34,
            roomId:st.rooms[0].id,
            shift:'Matutino',
            subjects:[sm(0,4),sm(1,4),sm(2,3),sm(3,3),sm(4,2)]
        },{
            id:S.id('group'),
            faculty:'Ciencias Económico Administrativas',
            career:'Lic. en Finanzas',
            degree:'5to semestre',
            code:'5° A',
            students:32,
            roomId:st.rooms[1].id,
            shift:'Matutino',
            subjects:[sm(0,3),sm(1,3),sm(5,4),sm(3,3)]
        },{
            id:S.id('group'),
            faculty:'Ciencias Económico Administrativas',
            career:'Lic. en Contaduría',
            degree:'3er semestre',
            code:'3° B',
            students:30,
            roomId:st.rooms[2].id,
            shift:'Matutino',
            subjects:[sm(2,4),sm(1,3),sm(5,3),sm(4,2)]
        }];
            const mods=7,avail=()=>Object.fromEntries(S.DAYS.map(d=>[d[0],Array(mods).fill(true)]));
            st.teachers=[
                ['Mtro. Ricardo Vázquez',[0]],
                ['Mtra. Laura Hernández',[1]],
                ['C.P. Jorge Muñoz',[2]],
                ['Ing. Sofía Ramírez',[3]],
                ['Lic. Patricia Cano',[4]],
                ['Mtro. Daniel Flores',[5]]
            ].map(x=>({
                id:S.id('teacher'),
                name:x[0],
                subjects:x[1].map(i=>st.subjects[i].id),
                dayMax:6,
                weekMax:30,
                availability:avail()
            }));
                st.merges=[{
                    id:S.id('merge'),
                    subjectId:st.subjects[4].id,
                    groups:[st.groups[0].id,st.groups[2].id]
                }];
                    S.setState(st);
                    step=0;editingGroup=editingTeacher=null;
                    renderAll();
                    bindSchool();
                    renderAvailability();
                    go(0);
                    toast('Ejemplo cargado.','success')
}
function backup(){
    const blob=new Blob([JSON.stringify(S.state,null,2)],{
        type:'application/json'
    }),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='respaldo_horarios_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
function bindGlobal(){
    $('#prev').onclick=()=>go(step-1);
    $('#next').onclick=()=>go(step+1);
    $('#loadDemo').onclick=demo;
    $('#backup').onclick=backup;
    $('#restore').onchange=e=>{
        const f=e.target.files[0];
        if(!f)return;
        const r=new FileReader();
        r.onload=()=>{
            try{S.setState(JSON.parse(r.result));
                step=0;
                renderAll();
                bindSchool();
                renderAvailability();
                go(0);
                toast('Respaldo restaurado.','success')
            }
            catch(err){
                toast('El archivo JSON no es válido.','error')}
        };
        r.readAsText(f)
    };
    $('#reset').onclick=()=>{
        if(confirm('¿Borrar todos los datos guardados?')){
            S.reset();
            step=0;
            renderAll();
            bindSchool();
            renderAvailability();
            go(0);
            toast('Datos eliminados.')
        }
    };
    $('#year').textContent=new Date().getFullYear()
}
function renderAll(){
    renderRooms();
    renderSubjects();
    renderGroups();
    renderTeachers();
    renderMerges();
    if(step===6)renderValidation();
    if(step===7)renderPreview()
}
buildNav();
bindSchool();
bindRooms();
bindSubjects();
bindGroups();
bindTeachers();
bindMerges();
bindGenerate();
bindPreview();
bindGlobal();
renderAll();
go(step);
})();
