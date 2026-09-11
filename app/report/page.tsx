"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { BarChart3, CalendarDays, Fish, MapPin, Sparkles, WalletCards, Waves } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { getGuestLogs } from "@/lib/guest-storage";

type Log={id:string;tripDate:string;location:string;boatName:string;fee:number;species:string;rig:string;weather:string;catchCount:number;maxSize:number|null;region?:string;tide?:number;tideLabel?:string};
type Group={name:string;count:number;trips:number;avg:number};

function groupBy(logs:Log[], key:(l:Log)=>string, value:(l:Log)=>number=l=>l.catchCount):Group[]{const map=new Map<string,{count:number;trips:number}>();logs.forEach(l=>{const k=key(l)?.trim();if(!k)return;const v=map.get(k)||{count:0,trips:0};v.count+=value(l)||0;v.trips+=1;map.set(k,v)});return [...map].map(([name,v])=>({name,...v,avg:v.trips?v.count/v.trips:0})).sort((a,b)=>b.avg-a.avg)}

export default function ReportPage(){
 const [user,setUser]=useState<User|null>(null),[logs,setLogs]=useState<Log[]>([]),[loading,setLoading]=useState(true);
 useEffect(()=>onAuthStateChanged(auth,async next=>{setUser(next);if(!next){setLogs(getGuestLogs<Log>());setLoading(false);return}try{const s=await getDocs(collection(db,"users",next.uid,"logs"));setLogs(s.docs.map(d=>({id:d.id,...d.data()} as Log)))}finally{setLoading(false)}}),[]);
 const report=useMemo(()=>{const totalCatch=logs.reduce((s,l)=>s+(l.catchCount||0),0),totalFee=logs.reduce((s,l)=>s+(l.fee||0),0);const species=groupBy(logs,l=>l.species),ports=groupBy(logs,l=>l.location),weather=groupBy(logs,l=>l.weather),rigs=groupBy(logs,l=>l.rig),tides=groupBy(logs,l=>l.tideLabel||(l.tide?`${l.tide}물`:""));const monthly=new Map<string,number>();logs.forEach(l=>{const m=l.tripDate?.slice(0,7);if(m)monthly.set(m,(monthly.get(m)||0)+(l.catchCount||0))});const months=[...monthly].sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);const maxMonth=Math.max(1,...months.map(x=>x[1]));const biggest=logs.filter(l=>l.maxSize).sort((a,b)=>(b.maxSize||0)-(a.maxSize||0))[0];return{totalCatch,totalFee,species,ports,weather,rigs,tides,months,maxMonth,biggest}},[logs]);
 const money=new Intl.NumberFormat("ko-KR"); const avg=logs.length?report.totalCatch/logs.length:0; const costPer=report.totalCatch?report.totalFee/report.totalCatch:0;
 return <Shell>
  <header className="flex h-[76px] items-center justify-between px-[22px] pb-2 pt-[18px]"><div><p className="text-xs font-semibold text-[#8a90a0]">MY FISHING REPORT</p><h1 className="mt-1 text-[23px] font-extrabold tracking-[-.7px] text-[#2f3142]">낚시 리포트</h1></div><div className="grid size-10 place-items-center rounded-xl bg-[#edf4ff] text-[#3988f2]"><BarChart3 className="size-5"/></div></header>
  <section className="space-y-5 px-4 pb-28 pt-2">
   {loading?<Empty text="리포트를 만드는 중..."/>:logs.length===0?<Empty text="출조 기록이 쌓이면 나만의 낚시 패턴을 분석해드려요."/>:<>
    <div className="grid grid-cols-2 gap-2"><Metric icon={<CalendarDays/>} label="총 출조" value={`${logs.length}회`}/><Metric icon={<Fish/>} label="총 조과" value={`${report.totalCatch}마리`}/><Metric icon={<Waves/>} label="평균 조과" value={`${avg.toFixed(1)}마리`}/><Metric icon={<WalletCards/>} label="마리당 비용" value={costPer?`${money.format(Math.round(costPer))}원`:"–"}/></div>
    <Card title="최근 6개월 조과" sub="월별 총 조과"><div className="mt-4 flex h-36 items-end gap-2">{report.months.map(([month,count])=><div key={month} className="flex flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-bold text-[#607a9e]">{count}</span><div className="w-full max-w-9 rounded-t-lg bg-gradient-to-t from-[#3988f2] to-[#82c7ff]" style={{height:`${Math.max(8,count/report.maxMonth*96)}px`}}/><span className="text-[10px] text-[#8a90a0]">{Number(month.slice(5))}월</span></div>)}</div></Card>
    <Card title="나의 출조 패턴" sub="기록된 평균 조과 기준"><div className="mt-3 grid grid-cols-2 gap-2"><Pattern icon={<MapPin/>} label="잘 잡히는 항구" item={report.ports[0]}/><Pattern icon={<Waves/>} label="잘 맞는 물때" item={report.tides[0]}/><Pattern icon={<Sparkles/>} label="잘 맞는 날씨" item={report.weather[0]}/><Pattern icon={<Fish/>} label="잘 맞는 채비" item={report.rigs[0]}/></div><p className="mt-3 text-[11px] leading-5 text-[#9297a6]">출조 횟수가 늘수록 패턴의 신뢰도가 높아집니다. 1회 기록만 있는 조건은 참고용으로 봐주세요.</p></Card>
    <Card title="어종별 조과" sub="누적 마릿수"><div className="mt-3 space-y-3">{report.species.slice().sort((a,b)=>b.count-a.count).slice(0,5).map((s,i)=>{const max=Math.max(1,...report.species.map(x=>x.count));return <div key={s.name}><div className="mb-1 flex justify-between text-xs"><b className="text-[#4d5364]">{s.name}</b><span className="text-[#7e8495]">{s.count}마리</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full rounded-full bg-[#6eacf7]" style={{width:`${s.count/max*100}%`}}/></div></div>})}</div></Card>
    <Card title="개인 기록" sub="지금까지의 베스트"><div className="mt-3 divide-y divide-[#eef0f5] text-sm"><Row label="최고 조과" value={logs.slice().sort((a,b)=>b.catchCount-a.catchCount)[0]?`${logs.slice().sort((a,b)=>b.catchCount-a.catchCount)[0].catchCount}마리 · ${logs.slice().sort((a,b)=>b.catchCount-a.catchCount)[0].location}`:"–"}/><Row label="최대어" value={report.biggest?`${report.biggest.species} ${report.biggest.maxSize}cm`:"–"}/><Row label="최다 어종" value={report.species.slice().sort((a,b)=>b.count-a.count)[0]?.name||"–"}/><Row label="총 선비" value={`${money.format(report.totalFee)}원`}/></div></Card>
   </>}
  </section>
 </Shell>
}
function Shell({children}:{children:React.ReactNode}){return <main className="min-h-dvh bg-[#eef1f8] text-[#2f3142]"><div className="mx-auto min-h-dvh max-w-[430px] bg-[#f7f8fc]">{children}</div></main>}
function Empty({text}:{text:string}){return <div className="mx-4 mt-4 rounded-[20px] border border-dashed border-[#dfe2eb] bg-white px-5 py-10 text-center text-sm leading-6 text-[#8a90a0]">{text}</div>}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-[17px] border border-[#e8e8f1] bg-white p-4"><div className="mb-3 size-4 text-[#74a9e8] [&>svg]:size-4">{icon}</div><b className="block text-xl text-[#313344]">{value}</b><span className="mt-1 block text-[11px] text-[#8a90a0]">{label}</span></div>}
function Card({title,sub,children}:{title:string;sub:string;children:React.ReactNode}){return <section className="rounded-[20px] border border-[#e6e7ef] bg-white p-4"><div className="flex items-end justify-between gap-2"><h2 className="text-base font-extrabold text-[#313344]">{title}</h2><span className="text-[10px] text-[#9297a6]">{sub}</span></div>{children}</section>}
function Pattern({icon,label,item}:{icon:React.ReactNode;label:string;item?:Group}){return <div className="rounded-[15px] bg-[#f7f9fc] p-3"><div className="flex items-center gap-1.5 text-[10px] text-[#8a90a0]"><span className="text-[#74a9e8] [&>svg]:size-3.5">{icon}</span>{label}</div><b className="mt-2 block truncate text-sm text-[#3f4556]">{item?.name||"데이터 없음"}</b><span className="mt-1 block text-[10px] text-[#9297a6]">{item?`평균 ${item.avg.toFixed(1)}마리 · ${item.trips}회`:""}</span></div>}
function Row({label,value}:{label:string;value:string}){return <div className="flex items-center justify-between gap-4 py-3"><span className="text-[#7e8495]">{label}</span><b className="text-right text-[#3f4556]">{value}</b></div>}
