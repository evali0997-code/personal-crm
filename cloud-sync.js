(()=>{'use strict';
const URL='https://osldmcvoeneuouwvbinm.supabase.co';
const KEY='sb_publishable__3NqawpHhNb9GBd_GKoviw_Or_djcyy';
const bridge=window.crmBridge;
const status=document.getElementById('cloudState'),email=document.getElementById('cloudEmail'),login=document.getElementById('cloudLogin'),password=document.getElementById('cloudPassword'),signup=document.getElementById('cloudSignup'),logout=document.getElementById('cloudLogout');
const say=t=>{if(status)status.textContent='云同步：'+t};
if(!bridge||!window.supabase){say('加载失败，请检查网络或刷新');return}
const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let user=null,timer=null,busy=false,queued=false,lastDay='';
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const pack=()=>{const d=bridge.get(),date=day();return {permanent:{clients:d.clients,labelClients:d.labelClients,nextLabelClient:d.nextLabelClient,labelMeta:d.labelMeta,nameRecords:d.nameRecords,tasks:d.tasks,nextClient:d.nextClient,nextName:d.nextName,version:d.version},daily:{orderDaily:d.orderDaily?.[date]||{},labelDaily:d.labelDaily?.[date]||{},taskDaily:d.taskDaily?.[date]||{}},work_date:date}};
const unpack=row=>{const local=bridge.get(),d=row.work_date===day()?row.daily||{}:{};return {...local,...(row.permanent||{}),orderDaily:{[day()]:d.orderDaily||{}},labelDaily:{[day()]:d.labelDaily||{}},taskDaily:{[day()]:d.taskDaily||{}}}};
async function upload(){if(!user||busy){queued=true;return}busy=true;try{const payload=pack();const {error}=await client.from('crm_state').upsert({user_id:user.id,...payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;say('已保存到云端 · '+payload.work_date)}catch(e){say('同步失败：'+e.message)}finally{busy=false;if(queued){queued=false;setTimeout(upload,250)}}}
window.crmCloudSave=()=>{if(!user)return;clearTimeout(timer);timer=setTimeout(upload,700)};
async function init(session){user=session?.user||null;logout.style.display=user?'inline-block':'none';email.style.display=user?'none':'inline-block';login.style.display=user?'none':'inline-block';password.style.display=user?'none':'inline-block';signup.style.display=user?'none':'inline-block';if(!user){say('未登录（当前仅本机保存）');return}
say('正在读取云端数据');const date=day();lastDay=date;
try{const {data,error}=await client.from('crm_state').select('*').eq('user_id',user.id).maybeSingle();if(error)throw error;
bridge.backup();
if(data){bridge.set(unpack(data));say('已读取云端资料');if(data.work_date!==date)await upload()}
else{const local=bridge.get();const cleaned={...local,orderDaily:{[date]:local.orderDaily?.[date]||{}},labelDaily:{[date]:local.labelDaily?.[date]||{}},taskDaily:{[date]:local.taskDaily?.[date]||{}}};bridge.set(cleaned);await upload()}
}catch(e){say('读取失败：'+e.message)}
}
async function passwordAuth(register){const value=email.value.trim(),pass=password.value;if(!value||!pass){say('请输入邮箱和密码');return}if(pass.length<6){say('密码至少需要 6 位');return}login.disabled=true;signup.disabled=true;say(register?'正在注册账号':'正在登录');try{const {data,error}=register?await client.auth.signUp({email:value,password:pass,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email:value,password:pass});if(error)throw error;if(data.session){say('登录成功，正在同步')}else{say(register?'注册请求已提交。如要求邮箱验证，请等邮件额度恢复后验证；或由管理员在 Supabase 控制台确认用户。':'账号尚未完成邮箱验证，请先验证邮箱')}}catch(e){say((register?'注册失败：':'登录失败：')+e.message)}finally{login.disabled=false;signup.disabled=false}}
login.onclick=()=>passwordAuth(false);
signup.onclick=()=>passwordAuth(true);
logout.onclick=async()=>{clearTimeout(timer);if(user)await upload();await client.auth.signOut();user=null;say('已退出');logout.style.display='none';login.style.display='inline-block';email.style.display='inline-block';password.style.display='inline-block';signup.style.display='inline-block'};
client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>init(session),0)});
client.auth.getSession().then(({data,error})=>{if(error)say(error.message);else init(data.session)});
setInterval(async()=>{if(!user)return;const now=day();if(lastDay!==now){lastDay=now;bridge.resetDaily(now);await upload()}},60000);
window.addEventListener('online',()=>{if(user)upload()});
})();