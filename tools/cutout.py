# -*- coding: utf-8 -*-
"""品红底实心角色层抠图：色相键控 → 最大连通域+孔洞填实 → 去色溢。
按《纯色底实心角色层抠图方法》执行；旧整图原样留档于 assets/raw/，不参与抠图。
验收：binary_fill_holes(alpha>128) & ~(alpha>128) 必须 = 0。
"""
import os,sys,json,base64
import numpy as np,cv2
from PIL import Image
from scipy import ndimage

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AS=os.path.join(ROOT,'assets')
RAW=os.path.join(AS,'raw')
OUT=os.path.join(AS,'layers')
os.makedirs(RAW,exist_ok=True);os.makedirs(OUT,exist_ok=True)

def largest(mask):
    n,lab,st,_=cv2.connectedComponentsWithStats((mask>0).astype(np.uint8),8)
    return (lab==(1+np.argmax(st[1:,cv2.CC_STAT_AREA]))).astype(bool) if n>1 else mask

def finish(solid,soft):
    inner=cv2.erode(solid.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)
    a=np.where(solid,np.maximum(soft,190),0).astype(np.float32)
    a=np.where(inner,255,a)
    return np.clip(cv2.GaussianBlur(a,(0,0),0.6),0,255).astype(np.uint8)

LOSSLESS={'loom5','kiln5','bridge5','well5','ink5','sail5','herd5','bell5',
 'plow6','sieve6','quill6','lamp6','drum6','net6','cart6','oven6'}
def cutout(src,dst,size=480,webp_quality=74,lossless=False):
    im=np.array(Image.open(src).convert('RGB'))
    H,W=im.shape[:2]
    R,G,B=[im[:,:,i].astype(np.float32) for i in range(3)]
    # 1) 品红系判定（对渐变玫红/紫红成立，不锁精确色值）
    mag=(R>145)&(B>85)&(G<R*0.60)&(G<B*0.72)&(G<125)
    score=np.minimum.reduce([(R-145)/60,(B-85)/50,
        (R*0.60-G)/40,(B*0.72-G)/40,(125-G)/40])
    soft=(255-np.clip(score*255,0,255)).astype(np.uint8)
    hard=(~mag).astype(np.uint8)
    # 右下角水印区：按原图比例抹除（旧文档是绝对像素，这里适配 1536）
    hard[:,-int(W*0.11):]=0
    hard[-int(H*0.10):,-int(W*0.18):]=0
    hard=cv2.morphologyEx(hard,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    solid=ndimage.binary_fill_holes(largest(hard))   # 2) 先填洞
    # 3) 后 despill：先算最终 alpha，再修「alpha>0 区域」内的品红残点。
    #    v2.5 修正：旧版只修 solid 内部，半透绒毛边会留 300~400 个品红像素，
    #    叠到暖米纸背景上就是一圈玫红毛边。现在内部 + 半透边一起修，
    #    验收口径也从 alpha>128 收紧到 alpha>0。
    a=finish(solid,soft)
    mag_wide=(R>125)&(B>70)&(G<R*0.72)&(G<B*0.85)&(G<150)
    keep=cv2.dilate((a>0).astype(np.uint8),np.ones((3,3),np.uint8))>0
    spill=cv2.dilate(((mag_wide|mag)&keep).astype(np.uint8)*255,np.ones((3,3),np.uint8))
    fixed=cv2.cvtColor(cv2.inpaint(cv2.cvtColor(im,cv2.COLOR_RGB2BGR),spill,3,cv2.INPAINT_TELEA),
        cv2.COLOR_BGR2RGB)
    # 半透边再做一次颜色去溢：品红是 R/B 高 G 低，把 R/B 压回 G 主导的中性灰白，
    # 避免 inpaint 从更外圈的品红背景取色、越修越红。
    edge=(a>0)&(a<250)
    rw,bw,gw=fixed[:,:,0].astype(float),fixed[:,:,2].astype(float),fixed[:,:,1].astype(float)
    pinkish=edge&(rw>gw*1.18)&(bw>gw*1.14)
    if pinkish.any():
        target=np.clip(gw*1.06+6,0,255)
        fixed[:,:,0]=np.where(pinkish,np.minimum(rw,target),rw).astype(np.uint8)
        fixed[:,:,2]=np.where(pinkish,np.minimum(bw,target),bw).astype(np.uint8)
    # v2.5：alpha=0 的区域本来是品红背景，LANCZOS 缩小时会把它混进半透绒毛边。
    # 先统一刷成暖米纸中性色，缩放后就不会再泛玫红。
    neutral=np.zeros_like(fixed);neutral[:]=[238,228,214]
    fixed=np.where((a==0)[:,:,None],neutral,fixed)
    out=Image.fromarray(np.dstack([fixed,a])).convert('RGBA')
    out=out.resize((size,size),Image.LANCZOS)
    # 缩后再做一次去溢，按最终 alpha 收紧到 0 残留
    arr=np.array(out.convert('RGBA'))
    rr,gg,bb,al=[arr[:,:,i].astype(int) for i in range(4)]
    pk=(rr>125)&(bb>70)&(gg<rr*0.72)&(gg<bb*0.85)&(gg<150)&(al>0)
    if pk.any():
        t=np.clip(gg*0.90+2,0,255)
        arr[:,:,0]=np.where(pk,np.minimum(rr,t),rr).astype(np.uint8)
        arr[:,:,2]=np.where(pk,np.minimum(bb,t),bb).astype(np.uint8)
        out=Image.fromarray(arr).convert('RGBA')
    if lossless:out.save(dst,'WEBP',lossless=True,method=6)
    else:out.save(dst,'WEBP',quality=webp_quality,method=6)
    holes=int(np.logical_and(ndimage.binary_fill_holes(a>128),~(a>128)).sum())
    arr=np.array(out.convert('RGBA'))
    rr,gg,bb,al=[arr[:,:,i].astype(int) for i in range(4)]
    pink=(rr>125)&(bb>70)&(gg<rr*0.72)&(gg<bb*0.85)&(gg<150)&(al>0)
    return {'holes':holes,'alpha':round(float((a>128).mean()),3),
            'pink':int(pink.sum()),
            'size':os.path.getsize(dst),'src':os.path.basename(src)}

SRC={
 'neutral':'core.png',
 'think':'think.png','happy':'happy.png','surprise':'surprise.png',
 'sad':'sad.png','read':'read.png','wave':'wave.png',
 'rain':'rain.png','sun':'sun.png',
 'scroll':'scroll.png','decree':'decree.png','compass':'compass.png',
 'count':'count.png','lamp':'lamp.png','snow':'snow.png',
 'sand':'sand.png','move':'move.png','harvest':'harvest.png','cheer':'cheer.png',
 'bell':'bell.png','forge':'forge.png','weave':'weave.png','loupe':'loupe.png',
 'herb':'herb.png','sail':'sail.png','seal':'seal.png','child':'child.png',
 'drum':'drum.png','blink':'blink.png',
 'breath_in':'breath_in.png','breath_out':'breath_out.png','brush':'brush.png',
 'pottery':'pottery.png','measure':'measure.png','build':'build.png',
 'cook':'cook.png','chess':'chess.png','fish':'fish.png','ride':'ride.png',
 'shelf':'shelf.png','farewell':'farewell.png','ink':'ink.png','loom':'loom.png',
 'coin':'coin.png','bridge':'bridge.png','well':'well.png','kite':'kite.png',
 'mask':'mask.png','flute':'flute.png',
 'seedling':'seedling.png','ledger':'ledger.png',
 'plow':'plow.png','grind':'grind.png','dye':'dye.png','cast':'cast.png',
 'copy':'copy.png','watch':'watch.png','pack':'pack.png','lute':'lute.png',
 'weave2':'weave2.png','plaster':'plaster.png','ferry':'ferry.png',
 'granary':'granary.png','astro':'astro.png','mint':'mint.png',
 'mask2':'mask2.png','drum2':'drum2.png',
 'loom3':'loom3.png','kiln3':'kiln3.png','bridge3':'bridge3.png','well3':'well3.png',
 'ink3':'ink3.png','sail3':'sail3.png','herd3':'herd3.png','bell3':'bell3.png',
 'plow4':'plow4.png','sieve4':'sieve4.png','quill4':'quill4.png','lamp4':'lamp4.png',
 'drum4':'drum4.png','net4':'net4.png','cart4':'cart4.png','oven4':'oven4.png',
 'loom5':'loom5.png','kiln5':'kiln5.png','bridge5':'bridge5.png','well5':'well5.png',
 'ink5':'ink5.png','sail5':'sail5.png','herd5':'herd5.png','bell5':'bell5.png',
 'plow6':'batch_v28/plow6.png','sieve6':'batch_v28/sieve6.png',
 'quill6':'batch_v28/quill6.png','lamp6':'batch_v28/lamp6.png',
 'drum6':'batch_v28/drum6.png','net6':'batch_v28/net6.png',
 'cart6':'batch_v28/cart6.png','oven6':'batch_v28/oven6.png'
}
def main():
    rep={}
    for k,f in SRC.items():
        src=os.path.join(RAW,f)
        if not os.path.exists(src):
            print('缺源图',src);continue
        d=cutout(src,os.path.join(OUT,k+'.webp'),lossless=(k in LOSSLESS))
        rep[k]=d
        print('%-10s holes=%d alpha=%.3f %6d B  %s'%(
            k,d['holes'],d['alpha'],d['size'],'✓' if d['holes']==0 else '✗'))
    # 背景板：压成 JPEG，单独存
    bgsrc=os.path.join(AS,'bg_clean.png')   # 抹过生成水印的干净版优先
    if not os.path.exists(bgsrc):bgsrc=os.path.join(RAW,'bg.png')
    bg=Image.open(bgsrc).convert('RGB')
    bg.thumbnail((720,960),Image.LANCZOS)
    bg.save(os.path.join(AS,'bg.jpg'),'JPEG',quality=80,optimize=True,progressive=True)
    print('背景板 bg.jpg',os.path.getsize(os.path.join(AS,'bg.jpg')),'B',bg.size)
    json.dump(rep,open(os.path.join(AS,'cutout_report.json'),'w',encoding='utf8'),
        ensure_ascii=False,indent=1)
    bad=[k for k,v in rep.items() if v['holes']!=0]
    if bad:
        print('❌ 孔洞未清零：',bad);sys.exit(1)
    print('✅ 全部层 holes=0，可叠任意背景板')

if __name__=='__main__':main()
