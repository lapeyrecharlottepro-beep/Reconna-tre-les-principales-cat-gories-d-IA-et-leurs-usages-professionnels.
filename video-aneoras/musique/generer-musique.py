import numpy as np, sys
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
SR=44100; DUR=86.0; N=int(SR*DUR)
BAR=3.96; T0=-0.09; BEAT=BAR/4
rng=np.random.default_rng(7)
t=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)
def hz(m): return 440*2**((m-69)/12)
def env_adsr(n,a,r):
    e=np.ones(n); na=int(a*SR); nr=int(r*SR)
    na=min(na,n); e[:na]=np.linspace(0,1,na)**1.5
    nr=min(nr,n-na); 
    if nr>0: e[n-nr:]*=np.linspace(1,0,nr)**1.5
    return e
def add(sig,start,pan=0.0,gain=1.0):
    i=int(start*SR); 
    if i<0: sig=sig[-i:]; i=0
    j=min(N,i+len(sig)); sig=sig[:j-i]
    gl=np.cos((pan+1)*np.pi/4); gr=np.sin((pan+1)*np.pi/4)
    L[i:j]+=sig*gl*gain; R[i:j]+=sig*gr*gain
def saw(f,n,detune=0.0,harm=14):
    tt=np.arange(n)/SR; s=np.zeros(n); ph=rng.uniform(0,2*np.pi)
    for k in range(1,harm+1):
        if f*k>9000: break
        s+=np.sin(2*np.pi*f*(1+detune)*k*tt+ph*k)/k
    return s
def lp(x,fc,order=2): return sosfilt(butter(order,fc,'low',fs=SR,output='sos'),x)
def hp(x,fc,order=2): return sosfilt(butter(order,fc,'high',fs=SR,output='sos'),x)
# chords (midi) : Dmaj9, Bm9, Gmaj7, A6sus -> loop
CH=[[50,57,61,64,66,69],[47,54,57,61,62,66],[43,50,54,57,59,62],[45,52,55,57,59,64]]
ROOT=[38,35,31,33]
def bar_t(k): return T0+k*BAR
NB=22
# ---- PAD
for k in range(NB):
    ch=CH[k%4]; st=bar_t(k); ln=BAR+1.6
    if k>=19: ch=CH[0]; 
    if k==20 or k==21: continue
    if k==19: ln=DUR-st
    n=int(ln*SR); e=env_adsr(n,1.2,1.5 if k<19 else 6.0)
    for i,m in enumerate(ch[1:]):
        s=(saw(hz(m),n,0.003)+saw(hz(m),n,-0.004))*0.5
        fc=900 if k<15 else (900+1600*min(1,(k-15)/3.5))
        if k>=19: fc=2600
        s=lp(s,fc)*e
        add(s,st,pan=(-0.5+i/len(ch)),gain=0.055)
# ---- sub bass
for k in range(NB):
    if k<2 or k in (20,21): continue
    r=ROOT[k%4] if k<19 else 38
    st=bar_t(k); ln=BAR if k<19 else DUR-st
    n=int(ln*SR); e=env_adsr(n,0.3,0.8 if k<19 else 5)
    s=np.sin(2*np.pi*hz(r)*np.arange(n)/SR)*e
    add(s,st,0,0.10 if k<15 else 0.14)
# ---- soft piano arpeggio
def pluck(f,ln=2.2,bright=1.0):
    n=int(ln*SR); tt=np.arange(n)/SR
    s=np.sin(2*np.pi*f*tt)+0.35*bright*np.sin(2*np.pi*2*f*tt)*np.exp(-tt*3)+0.12*bright*np.sin(2*np.pi*3*f*tt)*np.exp(-tt*5)
    e=np.exp(-tt*2.2)*np.minimum(1,tt/0.004)
    return s*e
PAT=[0,2,4,5,3,4,2,1]
for k in range(2,19):
    ch=CH[k%4]; notes=[m+12 for m in ch]
    step=BEAT/2 if k<15 else BEAT/4
    cnt=int(round(BAR/step))
    for i in range(cnt):
        m=notes[PAT[i%8]%len(notes)]
        if k>=15 and i%2==1: m=notes[(PAT[i%8]+2)%len(notes)]+12
        vel=0.9 if i%4==0 else 0.6
        g=0.045 if k<15 else 0.05+0.012*(k-15)
        if k<4: g*= (0.5+0.25*(k-2))
        add(pluck(hz(m)),bar_t(k)+i*step,pan=0.35*np.sin(i*1.3),gain=g*vel)
# ---- strings layer in the rise
for k in range(15,19):
    ch=CH[k%4]; st=bar_t(k); n=int((BAR+0.8)*SR)
    for i,m in enumerate([ch[2]+12,ch[4]+12,ch[5]+12]):
        tt=np.arange(n)/SR
        vib=np.sin(2*np.pi*5.2*tt)*0.003
        s=sum(np.sin(2*np.pi*hz(m)*h*(tt+np.cumsum(vib)/SR*0))/h**1.3 for h in range(1,7))
        s=lp(s,2400)*env_adsr(n,1.0,0.8)
        add(s,st,pan=-0.6+0.6*i,gain=0.018*(1+0.35*(k-15)))
# ---- soft kick + shaker in the rise
def kick():
    n=int(0.6*SR); tt=np.arange(n)/SR
    f=45+70*np.exp(-tt*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-tt*7)
def shaker():
    n=int(0.12*SR); s=hp(rng.standard_normal(n),6000); return s*np.exp(-np.arange(n)/SR*40)
for k in range(15,19):
    for b in range(4):
        add(kick(),bar_t(k)+b*BEAT,0,0.16 if b%2==0 else 0.09)
        add(shaker(),bar_t(k)+b*BEAT+BEAT/2,0.3,0.025)
# ---- riser into 59.31 and swell into logo 75.15
def riser(ln,f0,f1):
    n=int(ln*SR); x=rng.standard_normal(n); out=np.zeros(n); blk=2048
    for i in range(0,n,blk):
        fc=f0*(f1/f0)**(i/n); out[i:i+blk]=lp(x[i:i+blk],fc,1)[:len(out[i:i+blk])]
    return out*np.linspace(0,1,n)**2.5
add(riser(2.4,300,5000),59.31-2.4,0,0.06)
add(riser(2.6,300,7000),75.15-2.6,0,0.07)
# ---- logo impact
n=int(5*SR); tt=np.arange(n)/SR
boom=np.sin(2*np.pi*(38+40*np.exp(-tt*10))*tt)*np.exp(-tt*1.4)
add(boom,75.15,0,0.35)
for i,m in enumerate([74,78,81,85,88,93]):   # shimmer bell D maj9
    add(pluck(hz(m),5.0,0.5)*0.8,75.15+i*0.09,pan=-0.6+0.24*i,gain=0.045)
# ---- reverb
def ir(sec,seed):
    r=np.random.default_rng(seed); n=int(sec*SR); tt=np.arange(n)/SR
    return r.standard_normal(n)*np.exp(-tt*3.0/sec*2.2)
wetL=fftconvolve(L,ir(3.2,1))[:N]; wetR=fftconvolve(R,ir(3.2,2))[:N]
sc=np.max(np.abs(wetL))/max(1e-9,np.max(np.abs(L)))
L2=L+wetL/sc*0.55; R2=R+wetR/sc*0.55
# ---- global dynamics envelope (music sits behind the voice; rises at 59.3)
g=np.interp(t,[0,3,57.5,59.3,62,74.5,75.15,79,83,86],
              [0.0,0.75,0.75,1.0,1.15,1.25,1.4,1.3,0.7,0.0])
L2*=g; R2*=g
L2=hp(L2,35); R2=hp(R2,35)
pk=max(np.abs(L2).max(),np.abs(R2).max()); L2/=pk/0.89; R2/=pk/0.89
wavfile.write(sys.argv[1],SR,(np.stack([L2,R2],1)*32767).astype(np.int16))
