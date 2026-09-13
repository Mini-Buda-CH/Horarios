(function(g){'use strict';const S=g.Store;
const argb=h=>'FF'+String(h||'#000000').replace('#','').toUpperCase();
const border={
    top:{
        style:'thin',
        color:{rgb:'FF303641'}
    },
    bottom:{
        style:'thin',
        color:{rgb:'FF303641'}
    },
    left:{
        style:'thin',
        color:{rgb:'FF303641'}
    },
    right:{
        style:'thin',
        color:{rgb:'FF303641'}
    }
};
const styles={
    title:{
        font:{
            bold:true,
            color:{rgb:'FFFFFFFF'},
            sz:18
        },
        fill:{
            fgColor:{rgb:'FF0B0D11'}
        },
        alignment:{vertical:'center'}
    },
    subtitle:{
        font:{
            color:{rgb:'FFAAB2C1'},
            sz:11},
            fill:{
                fgColor:{rgb:'FF0B0D11'}
            }
        },
        section:{
            font:{
                bold:true,
                color:{rgb:'FFFFFFFF'},
                sz:12},
                fill:{
                    fgColor:{rgb:'FF1C2029'}
                },
                alignment:{
                    vertical:'center'
                }
        },
        header:{
            font:{
                bold:true,
                color:{rgb:'FFFFFFFF'}
            },
            fill:{
                fgColor:{rgb:'FF161920'}
            },
            alignment:{
                horizontal:'center',
                vertical:'center',
                wrapText:true
            },
            border
        },
        label:{
            font:{
                bold:true,
                color:{rgb:'FFAAB2C1'}
            },
            fill:{
                fgColor:{rgb:'FF101217'}
            },
            border
        },
        value:{
            font:{
                color:{rgb:'FFFFFFFF'}
            },
            fill:{
                fgColor:{rgb:'FF101217'}
            },
            border
        },
        time:{
            font:{
                color:{rgb:'FFAAB2C1'},
                sz:10
            },
            fill:{
                fgColor:{rgb:'FF101217'}
            },
            alignment:{
                horizontal:'center',
                vertical:'center',
                wrapText:true
            },
            border
        },
        free:{
            font:{
                color:{rgb:'FF747E90'}
            },
            fill:{
                fgColor:{rgb:'FF0D0F13'}
            },
            alignment:{
                horizontal:'center',
                vertical:'center'
            },
            border
        },
        break:{
            font:{
                bold:true,
                color:{rgb:'FFF1BD4E'}
            },
            fill:{
                fgColor:{rgb:'FF251D0A'}
            },
            alignment:{
                horizontal:'center',
                vertical:'center'
            },
            border
        },
        footer:{
            font:{
                italic:true,
                color:{rgb:'FF747E90'},
                sz:9
            },
            fill:{
                fgColor:{rgb:'FF0B0D11'}
            },
            alignment:{
                horizontal:'center'}
            }
};
function apply(ws,range,style){
    const r=XLSX.utils.decode_range(range);
    for(let R=r.s.r;
        R<=r.e.r;
        R++)for(let C=r.s.c;
            C<=r.e.c;
            C++){
                const a=XLSX.utils.encode_cell({r:R,c:C});
                if(!ws[a])ws[a]={t:'s',v:''};
                ws[a].s=JSON.parse(JSON.stringify(style))
            }
}
function sheetName(gr,used){
    let b=S.groupName(gr).replace(/[\\/?*\[\]:]/g,'-').slice(0,28)||'Grupo',n=b,i=2;
    while(used.has(n))n=(b.slice(0,25)+' '+i++);
    used.add(n);
    return n
}
function groupSheet(gr,res){
    const st=S.state,d=res.days,m=res.modules,room=st.rooms.find(x=>x.id===gr.roomId);
    const data=[];
 data.push(['Horario escolar · '+(st.school.name||'Escuela'),...Array(d.length).fill('')]);
 data.push([[gr.career,gr.degree,gr.code].filter(Boolean).join(' · ')+'  ·  Ciclo: '+(st.school.cycle||'—'),...Array(d.length).fill('')]);
 data.push([]);
 data.push(['Generales',...Array(d.length).fill('')]);
 [['Facultad / Escuela',gr.faculty],['Carrera o licenciatura',gr.career],['Semestre',gr.degree],['Identificador del grupo',gr.code],['Total de alumnos',gr.students],['Turno',gr.shift||'—'],['Aula base asignada',room?room.name+' (cap. '+room.capacity+')':'Automática'],['Días de clase',d.map(x=>x.name).join(', ')],['Horario del plantel',st.school.start+' a '+st.school.end],['Duración del módulo',st.school.duration+' minutos'],['Módulos por día',m.length+' ('+m.filter(x=>x.break).length+' de receso)'],['Máx. módulos continuos por materia',st.school.maxContinuous],['Horas de clase solicitadas por semana',(gr.subjects||[]).reduce((a,x)=>a+(+x.hours||0),0)],['Módulos libres del grupo',res.summary[gr.id]?.free??'—']].forEach(x=>data.push([x[0],x[1],...Array(Math.max(0,d.length-1)).fill('')]));
 data.push([]);
 data.push(['Horario semanal',...Array(d.length).fill('')]);
 data.push(['Hora',...d.map(x=>x.name.toUpperCase())]);
 const grid=res.grids.groups[gr.id]||[];
 m.forEach((mod,mi)=>{
    const row=[mod.label];
    d.forEach((day,di)=>{
    const c=grid[di]?.[mi];
    if(mod.break)row.push('Receso');
    else if(!c)row.push('Libre');
    else{const sub=st.subjects.find(x=>x.id===c.subjectId)||{},te=st.teachers.find(x=>x.id===c.teacherId)||{},ro=st.rooms.find(x=>x.id===c.roomId)||{};
    row.push([sub.name,te.name,ro.name,c.merge?'(grupos combinados)':''].filter(Boolean).join('\n'))}});
    data.push(row)
});
 data.push([]);
 data.push(['Materias',...Array(d.length).fill('')]);
 data.push(['Materia','Docente','Horas / Semana','Módulos / Semana','Salón designado','Observaciones']);
 (res.summary[gr.id]?.rows||[]).forEach(x=>data.push([[x.subject,x.code&&'('+x.code+')'].filter(Boolean).join(' '),x.teacher,x.hours,x.assigned+' / '+x.requested,x.rooms.join(', ')||'—',x.shared?'Sesión con grupos combinados':'']));
 data.push([]);
 data.push(['Generado con Horarios · '+new Date().toLocaleDateString('es-MX'),...Array(d.length).fill('')]);
 const ws=XLSX.utils.aoa_to_sheet(data),last=Math.max(d.length,5),rTitle=1,rSection=4,rSchedule=20,rHeader=21,rStart=22,rEnd=rStart+m.length-1,rMat=rEnd+2,rMatHead=rMat+1,rFooter=data.length;
 ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:last}},{s:{r:1,c:0},e:{r:1,c:last}},{s:{r:3,c:0},e:{r:3,c:last}},{s:{r:rSchedule-1,c:0},e:{r:rSchedule-1,c:last}},{s:{r:rMat-1,c:0},e:{r:rMat-1,c:last}},{s:{r:rFooter-1,c:0},e:{r:rFooter-1,c:last}}];
 apply(ws,'A1:'+XLSX.utils.encode_col(last)+'1',styles.title);
 apply(ws,'A2:'+XLSX.utils.encode_col(last)+'2',styles.subtitle);
 apply(ws,'A4:'+XLSX.utils.encode_col(last)+'4',styles.section);
 for(let r=5;r<=18;r++){
    apply(ws,'A'+r,styles.label);
    apply(ws,'B'+r+':'+XLSX.utils.encode_col(last)+r,styles.value)
}
apply(ws,'A'+rSchedule+':'+XLSX.utils.encode_col(last)+rSchedule,styles.section);
apply(ws,'A'+rHeader+':'+XLSX.utils.encode_col(last)+rHeader,styles.header);
 m.forEach((mod,mi)=>{
    const rr=rStart+mi;
    apply(ws,'A'+rr,styles.time);
    for(let di=0;di<d.length;di++){
        const addr=XLSX.utils.encode_col(di+1)+rr,c=grid[di]?.[mi];
        if(mod.break)apply(ws,addr,styles.break);
        else if(!c)apply(ws,addr,styles.free);
        else{
            const sub=st.subjects.find(x=>x.id===c.subjectId)||{};
            const sty={
                font:{
                    bold:true,
                    color:{
                        rgb:argb(S.textColor(sub.color))
                    },
                    sz:10
                },
                fill:{
                    fgColor:{
                        rgb:argb(S.darken(sub.color,.56))
                    }
                },
                alignment:{
                    horizontal:'left',
                    vertical:'center',
                    wrapText:true
                },
                border
            };
            apply(ws,addr,sty)
        }
    }
});
apply(ws,'A'+rMat+':F'+rMat,styles.section);
apply(ws,'A'+rMatHead+':F'+rMatHead,styles.header);
for(let r=rMatHead+1;
    r<rFooter-1;
    r++)apply(ws,'A'+r+':F'+r,styles.value);
    apply(ws,'A'+rFooter+':'+XLSX.utils.encode_col(last)+rFooter,styles.footer);
 ws['!cols']=[{wch:20},...d.map(()=>({wch:27}))];
 for(let i=d.length+1;
    i<=last;
    i++)ws['!cols'][i]={wch:24};
    ws['!rows']=data.map((x,i)=>({hpt:i===0?28:(i>=rStart-1&&i<=rEnd-1?52:22)}));
    ws['!views']=[{
        state:'frozen',
        xSplit:1,
        ySplit:rHeader,
        topLeftCell:'B'+(rHeader+1),
        activePane:'bottomRight'
    }];
    return ws
}
function summary(res){
    const st=S.state,data=[
        ['Resumen general · '+(st.school.name||'Escuela'),'','','','','',''],
        ['Ciclo: '+(st.school.cycle||'—')+' · Generado: '+new Date().toLocaleDateString('es-MX'),'','','','','',''],
        [],
        ['Generales','','','','','',''],
        ['Días de clase',res.days.map(x=>x.name).join(', ')],
        ['Hora de inicio',st.school.start],
        ['Hora de término',st.school.end],
        ['Duración del módulo (min)',st.school.duration],
        ['Máx. módulos continuos',st.school.maxContinuous],
        ['Módulos por día',res.modules.length],
        ['Grupos / Aulas / Materias / Docentes',[st.groups.length,st.rooms.length,st.subjects.length,st.teachers.length].join(' / ')],
        [],
        ['Grupos','','','','','',''],
        ['Facultad','Carrera','Semestre','Grupo','Alumnos','Salón base','Horas libres']
    ];
    st.groups.forEach(gr=>data.push([gr.faculty,gr.career,gr.degree,gr.code,gr.students,st.rooms.find(x=>x.id===gr.roomId)?.name||'Automática',res.summary[gr.id]?.free??'—']));
    data.push(
        [],
        ['Horas docentes','','','','','',''],
        ['Docente','Materias','Módulos / Semana.','Horas / Semana.','','','']);
        st.teachers.forEach(t=>data.push([t.name,(t.subjects||[]).map(id=>st.subjects.find(x=>x.id===id)?.name).filter(Boolean).join(', '),res.teacherLoad[t.id]||0,S.modulesToHours(res.teacherLoad[t.id]||0)]));
        if(res.missing.length){
            data.push(
                [],
                ['Horas pendientes','','','','','',''],
                ['Materia','Semestres','Módulos','Horas','Motivo','','']
            );
            res.missing.forEach(x=>data.push([x.subject,x.groups,x.modules,x.hours,x.reason]))
        }
        const ws=XLSX.utils.aoa_to_sheet(data);
        ws['!merges']=[{
            s:{r:0,c:0},
            e:{r:0,c:6}
        },{
            s:{r:1,c:0},
            e:{r:1,c:6}
        },{
            s:{r:3,c:0},
            e:{r:3,c:6}
        },{
            s:{r:12,c:0},
            e:{r:12,c:6}
        }];
        apply(ws,'A1:G1',styles.title);
        apply(ws,'A2:G2',styles.subtitle);
        apply(ws,'A4:G4',styles.section);
        apply(ws,'A13:G13',styles.section);
        apply(ws,'A14:G14',styles.header);
        const loadRow=16+st.groups.length;
        apply(ws,'A'+loadRow+':G'+loadRow,styles.section);
        apply(ws,'A'+(loadRow+1)+':G'+(loadRow+1),styles.header);
        ws['!cols']=[{wch:30},{wch:38},{wch:20},{wch:16},{wch:14},{wch:22},{wch:18}];
        return ws
}
function exportBook(){
    if(!g.XLSX)return{ok:false,error:'No se cargó la biblioteca XLSX.'};
    const res=S.state.result;
    if(!res?.ok)return{ok:false,error:'Primero genera los horarios.'};
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,summary(res),'Resumen');
    const used=new Set(['Resumen']);
    S.state.groups.forEach(gr=>XLSX.utils.book_append_sheet(wb,groupSheet(gr,res),sheetName(gr,used)));
    const base=(S.state.school.name||'Escuela').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/g,'_').slice(0,40);const name='Horarios_'+base+'_'+new Date().toISOString().slice(0,10)+'.xlsx';
    XLSX.writeFile(wb,name,{cellStyles:true});
    return{ok:true,name,sheets:wb.SheetNames.length}
}
g.Exporter={exportBook};
})(window);
