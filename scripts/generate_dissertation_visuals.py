from pathlib import Path
import json
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'dissertation'/'figures'; OUT.mkdir(parents=True,exist_ok=True)
BLUE='#155EEF'; NAVY='#0B1F3A'; TEAL='#0E9384'; GREEN='#17B26A'; RED='#D92D20'; AMBER='#F79009'; GREY='#667085'; LIGHT='#F2F4F7'

def base(figsize=(10,5.4)):
    fig,ax=plt.subplots(figsize=figsize,dpi=180); fig.patch.set_facecolor('white'); ax.set_facecolor('white'); ax.axis('off'); return fig,ax
def box(ax,x,y,w,h,title,subtitle='',color=BLUE):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0.012,rounding_size=.02',fc='white',ec=color,lw=1.8))
    ax.text(x+w/2,y+h*.62,title,ha='center',va='center',fontsize=11,fontweight='bold',color=NAVY)
    if subtitle: ax.text(x+w/2,y+h*.28,subtitle,ha='center',va='center',fontsize=9,color=GREY,wrap=True)
def arrow(ax,a,b,color=GREY): ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=12,lw=1.4,color=color,connectionstyle='arc3'))
def save(fig,name): fig.tight_layout(pad=.4); fig.savefig(OUT/name,bbox_inches='tight',facecolor='white'); plt.close(fig)

fig,ax=base((11,6)); ax.set_xlim(0,1); ax.set_ylim(0,1)
box(ax,.03,.66,.19,.22,'Data sources','Withings • simulator • CSV • manual',TEAL)
box(ax,.29,.66,.19,.22,'React client','Patient • doctor • nurse • admin',BLUE)
box(ax,.29,.34,.19,.22,'FastAPI service','Validation • RBAC • workflows',NAVY)
box(ax,.03,.34,.19,.22,'PostgreSQL','Clinical truth • audit • research',GREEN)
box(ax,.55,.34,.19,.22,'Safety & intelligence','Rules • ML • SHAP • Groq',AMBER)
box(ax,.55,.66,.19,.22,'Live messaging','Redis • WebSocket • polling',TEAL)
box(ax,.81,.50,.16,.22,'Operations','Health • Sentry • backup • CI',GREY)
for a,b in [((.22,.77),(.29,.77)),((.385,.66),(.385,.56)),((.29,.45),(.22,.45)),((.48,.45),(.55,.45)),((.64,.56),(.64,.66)),((.74,.77),(.81,.64)),((.74,.45),(.81,.56))]: arrow(ax,a,b)
ax.text(.5,.96,'Health Risk Dashboard: layered system architecture',ha='center',fontsize=15,fontweight='bold',color=NAVY)
save(fig,'architecture.png')

fig,ax=base((10,5.4)); ax.set_xlim(0,1); ax.set_ylim(0,1)
roles=[('Patient','Own linked record only',TEAL),('Doctor','Actively assigned patients',BLUE),('Nurse','Actively assigned patients',GREEN),('Administrator','Identity, assignment and governance',AMBER)]
for i,(t,s,c) in enumerate(roles): box(ax,.05,.75-i*.2,.28,.13,t,s,c); arrow(ax,(.33,.815-i*.2),(.47,.815-i*.2),c)
box(ax,.47,.30,.23,.50,'Backend policy boundary','JWT validation\nactive status\nrole check\nassignment query\n404 privacy response',NAVY)
box(ax,.76,.52,.19,.18,'Clinical records','Patient-scoped access',RED); box(ax,.76,.25,.19,.18,'Admin/research','No routine clinical access',GREY)
arrow(ax,(.70,.62),(.76,.61)); arrow(ax,(.70,.42),(.76,.34))
ax.text(.5,.96,'Role and patient-access boundary',ha='center',fontsize=15,fontweight='bold',color=NAVY)
save(fig,'role_access.png')

fig,ax=base((11,5)); ax.set_xlim(0,1); ax.set_ylim(0,1)
items=[('1. Receive','Signed/authenticated\nobservation',TEAL),('2. Validate','Schema • units\n• provenance',BLUE),('3. Deduplicate','External measurement\nidentity',NAVY),('4. Persist','PostgreSQL\ntransaction',GREEN),('5. Evaluate','Deterministic safety\nbefore ML',RED),('6. Notify','Stored alert +\nRedis/WebSocket',AMBER)]
for i,(t,s,c) in enumerate(items): x=.025+i*.163; box(ax,x,.42,.14,.27,t,s,c)
for i in range(5): arrow(ax,(.165+i*.163,.555),(.188+i*.163,.555))
ax.text(.5,.88,'Observation-to-alert data flow',ha='center',fontsize=15,fontweight='bold',color=NAVY)
ax.text(.5,.17,'Durable state is authoritative; live channels accelerate delivery but do not replace persistence.',ha='center',fontsize=10,color=GREY)
save(fig,'data_flow.png')

fig,ax=base((11,5)); ax.set_xlim(0,1); ax.set_ylim(0,1)
stages=[('Licensed\ncohort',TEAL),('Patient-grouped\nsplit',BLUE),('Temporal\nfeatures',NAVY),('Candidate\nmodels',AMBER),('Calibration\n+ threshold',RED),('Locked\nevaluation',GREEN),('Versioned\nartifact',BLUE),('Shadow\nmonitoring',TEAL)]
for i,(t,c) in enumerate(stages): x=.015+i*.123; box(ax,x,.43,.105,.24,t,'',c)
for i in range(7): arrow(ax,(.12+i*.123,.55),(.138+i*.123,.55))
ax.text(.5,.88,'Reproducible machine-learning lifecycle',ha='center',fontsize=15,fontweight='bold',color=NAVY)
ax.text(.5,.22,'Outcome: qualifying critical vital event in the following six-hour window',ha='center',fontsize=10,fontweight='bold',color=RED)
save(fig,'ml_pipeline.png')

e=json.loads((ROOT/'backend'/'artifacts'/'ml'/'evaluation.json').read_text()); cm=e['test_metrics']['confusion_matrix']
mat=np.array([[cm['tn'],cm['fp']],[cm['fn'],cm['tp']]])
fig,ax=plt.subplots(figsize=(6.5,5.4),dpi=180); im=ax.imshow(mat,cmap='Blues'); ax.set_xticks([0,1],['Predicted negative','Predicted positive']); ax.set_yticks([0,1],['Observed negative','Observed positive']);
for (i,j),v in np.ndenumerate(mat): ax.text(j,i,f'{v:,}',ha='center',va='center',fontsize=18,fontweight='bold',color='white' if v>mat.max()/2 else NAVY)
ax.set_title('Internal test confusion matrix\nThreshold = 0.014',fontweight='bold',color=NAVY,pad=16); fig.colorbar(im,ax=ax,fraction=.045,pad=.04); save(fig,'confusion_matrix.png')

cal=e['test_metrics']['calibration']; pred=[p['predicted'] for p in cal]; obs=[p['observed'] for p in cal]
fig,ax=plt.subplots(figsize=(7,5.5),dpi=180); ax.plot([0,.09],[0,.09],'--',color=GREY,label='Ideal calibration'); ax.plot(pred,obs,'o-',color=BLUE,lw=2,label='Model'); ax.set(xlabel='Mean predicted probability',ylabel='Observed event frequency',title='Internal test calibration'); ax.grid(alpha=.25); ax.legend(frameon=False); ax.set_xlim(0,.09); ax.set_ylim(0,.09); fig.tight_layout(); save(fig,'calibration.png')

candidate=e['candidate_validation']; names=['Logistic regression','Random forest']; metrics=['roc_auc','pr_auc','f1']; labels=['ROC-AUC','PR-AUC','F1'];
x=np.arange(len(names)); width=.22
fig,ax=plt.subplots(figsize=(8,5.4),dpi=180)
for offset,(metric,label,color) in enumerate(zip(metrics,labels,[BLUE,TEAL,AMBER])):
    values=[candidate['logistic_regression'][metric],candidate['random_forest'][metric]]
    bars=ax.bar(x+(offset-1)*width,values,width,label=label,color=color)
    ax.bar_label(bars,fmt='%.3f',padding=3,fontsize=9)
ax.set_xticks(x,names); ax.set_ylim(0,1); ax.set_ylabel('Validation metric value'); ax.set_title('Candidate-model validation comparison',fontweight='bold',color=NAVY); ax.grid(axis='y',alpha=.2); ax.legend(frameon=False); fig.tight_layout(); save(fig,'candidate_model_comparison.png')

internal=e['test_metrics']; external=e['external_validation']['metrics']; compare=['roc_auc','pr_auc','recall_sensitivity','specificity','precision']; compare_labels=['ROC-AUC','PR-AUC','Sensitivity','Specificity','Precision']; x=np.arange(len(compare_labels)); width=.34
fig,ax=plt.subplots(figsize=(9,5.4),dpi=180)
bars1=ax.bar(x-width/2,[internal[k] for k in compare],width,label='Internal test',color=BLUE)
bars2=ax.bar(x+width/2,[external[k] for k in compare],width,label='External Set B',color=TEAL)
ax.bar_label(bars1,fmt='%.3f',padding=3,fontsize=8); ax.bar_label(bars2,fmt='%.3f',padding=3,fontsize=8)
ax.set_xticks(x,compare_labels); ax.set_ylim(0,.95); ax.set_ylabel('Metric value'); ax.set_title('Internal and related-cohort retrospective performance',fontweight='bold',color=NAVY); ax.grid(axis='y',alpha=.2); ax.legend(frameon=False); fig.tight_layout(); save(fig,'cohort_metric_comparison.png')

sh=json.loads((ROOT/'docs'/'evidence'/'global-shap.json').read_text()); vals=sh.get('features',sh.get('feature_importance',[]))
if isinstance(vals,dict): vals=[{'feature':k,'mean_absolute_shap':v} for k,v in vals.items()]
vals=sorted(vals,key=lambda x:x.get('mean_absolute_shap',0),reverse=True)[:10][::-1]
fig,ax=plt.subplots(figsize=(8,5.8),dpi=180); ax.barh([v['feature'].replace('_',' ') for v in vals],[v['mean_absolute_shap'] for v in vals],color=TEAL); ax.set_xlabel('Mean absolute SHAP value'); ax.set_title('Global model feature influence',fontweight='bold',color=NAVY); ax.grid(axis='x',alpha=.2); fig.tight_layout(); save(fig,'global_shap.png')

fig,ax=base((10,5.5)); ax.set_xlim(0,1); ax.set_ylim(0,1)
box(ax,.05,.60,.22,.22,'Vercel frontend','HTTPS React application',BLUE); box(ax,.39,.60,.22,.22,'Render API','FastAPI • migrations • health',NAVY); box(ax,.73,.60,.22,.22,'Aiven PostgreSQL','TLS • limited pool • backups',GREEN)
box(ax,.22,.18,.22,.20,'Redis','Cross-instance broadcast',TEAL); box(ax,.56,.18,.22,.20,'External services','Groq • Withings • Sentry',AMBER)
for a,b in [((.27,.71),(.39,.71)),((.61,.71),(.73,.71)),((.50,.60),(.35,.38)),((.53,.60),(.67,.38))]: arrow(ax,a,b)
ax.text(.5,.93,'Production deployment topology',ha='center',fontsize=15,fontweight='bold',color=NAVY)
save(fig,'deployment.png')

fig,ax=base((11,5.5)); ax.set_xlim(0,1); ax.set_ylim(0,1)
items=[('Authorised\nretrieval','Current PostgreSQL\nevidence',TEAL),('Untrusted-data\nboundary','Notes cannot issue\ninstructions',BLUE),('Groq\ngeneration','Timeout • retry\n• budget',AMBER),('Schema\nvalidation','Fields • evidence\n• timestamps',NAVY),('Safety\ndecision','Reject unsafe/\ncritical claims',RED),('Clinical\npresentation','Citations • freshness\n• warning',GREEN)]
for i,(t,s,c) in enumerate(items): x=.025+i*.163; box(ax,x,.43,.14,.29,t,s,c)
for i in range(5): arrow(ax,(.165+i*.163,.575),(.188+i*.163,.575))
ax.text(.5,.91,'Evidence-bound AI assistant pipeline',ha='center',fontsize=15,fontweight='bold',color=NAVY)
ax.text(.5,.18,'Actual emergency thresholds bypass the provider and trigger deterministic guidance.',ha='center',fontsize=10,fontweight='bold',color=RED)
save(fig,'ai_safety.png')
print(f'Generated visuals in {OUT}')
