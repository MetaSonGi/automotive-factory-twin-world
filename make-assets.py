# Author original GLB files with reusable cube mesh and named component nodes.
import struct,json
from pathlib import Path
positions=[(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]
indices=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,1,2,6,1,6,5,0,4,7,0,7,3]
parts={
 'car':[('body',[0,.45,0],[3.5,.6,1.5],0),('cab',[.1,1,0],[1.8,.6,1.3],1),*[(f'wheel-{i}',[x,.2,z],[.6,.45,.2],2)for i,(x,z)in enumerate([(-1.1,-.8),(1.1,-.8),(-1.1,.8),(1.1,.8)])]],
 'amr':[('base',[0,.3,0],[1.5,.5,1.1],3),('deck',[0,.65,0],[1.2,.2,.9],2),('payload',[0,1,0],[.8,.6,.7],4)],
 'humanoid':[('torso',[0,1.15,0],[.55,.7,.35],0),('head',[0,1.72,0],[.4,.35,.35],0),('visor',[0,1.75,.19],[.3,.1,.02],1),*[(f'leg-{i}',[x,.4,0],[.2,.7,.2],0)for i,x in enumerate([-.18,.18])],*[(f'arm-{i}',[x,1.05,0],[.18,.8,.18],0)for i,x in enumerate([-.4,.4])]],
 'robot':[('base',[0,.2,0],[1.2,.4,1.2],2),('shoulder',[0,.7,0],[.6,.6,.6],5),('upper-arm',[0,1.6,0],[.4,1.4,.4],5),('forearm',[.6,2.3,0],[1.3,.35,.35],5),('tool',[1.2,2,0],[.2,.6,.2],2)]}
for name,ps in parts.items():
 b=struct.pack('<24f',*(v for p in positions for v in p))+struct.pack('<36H',*indices)
 colors=[[.65,.8,.85,1],[.15,.32,.4,1],[.1,.16,.18,1],[.6,.75,.3,1],[.6,.4,.2,1],[.95,.5,.15,1]]
 obj={'asset':{'version':'2.0','generator':'Original procedural factory assets; NOT Tripo'},'scene':0,'scenes':[{'nodes':list(range(len(ps)))}],'nodes':[{'name':n,'mesh':mi,'translation':t,'scale':s}for n,t,s,mi in ps],'materials':[{'pbrMetallicRoughness':{'baseColorFactor':c,'metallicFactor':.2,'roughnessFactor':.6}}for c in colors],'meshes':[{'primitives':[{'attributes':{'POSITION':0},'indices':1,'material':i}]}for i in range(len(colors))],'buffers':[{'byteLength':len(b)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':96,'target':34962},{'buffer':0,'byteOffset':96,'byteLength':72,'target':34963}],'accessors':[{'bufferView':0,'componentType':5126,'count':8,'type':'VEC3','min':[-.5]*3,'max':[.5]*3},{'bufferView':1,'componentType':5123,'count':36,'type':'SCALAR'}]}
 j=json.dumps(obj,separators=(',',':')).encode();j+=b' '*((-len(j))%4);b+=b'\0'*((-len(b))%4)
 glb=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b
 Path(name+'.glb').write_bytes(glb)
print('4 authored GLB models generated')
