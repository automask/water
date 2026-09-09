import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'node:fs/promises';
const dir = new URL('../renders/', import.meta.url);
const analysis=[];
for(const file of (await readdir(dir)).filter(n=>/^render-compare-.*\.json$/.test(n))){
    const report=JSON.parse(await readFile(new URL(file,dir),'utf8'));
    const baseline=await sharp(new URL(report.results[0].image,dir).pathname).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const {width,height}=baseline.info;
    const variants=[];
    for(const result of report.results.slice(1)){
        const candidate=await sharp(new URL(result.image,dir).pathname).removeAlpha().raw().toBuffer();
        if(candidate.length!==baseline.data.length)throw new Error('Mismatched capture dimensions');
        const regions={frame:[0,0,width,height],sky:[0,0,width,Math.floor(height*.25)],centre:[Math.floor(width*.4),Math.floor(height*.3),Math.floor(width*.6),Math.floor(height*.7)]};
        const metrics={};
        for(const [name,[x0,y0,x1,y1]] of Object.entries(regions)){
            let sum=0,count=0,max=0,over2=0;const signed=[0,0,0];
            for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let c=0;c<3;c++){
                const i=(y*width+x)*3+c,d=candidate[i]-baseline.data[i];
                sum+=Math.abs(d);signed[c]+=d;max=Math.max(max,Math.abs(d));over2+=Math.abs(d)>2;count++;
            }
            metrics[name]={meanAbsoluteChannelError:+(sum/count).toFixed(4),maxChannelError:max,channelsOver2Percent:+(over2/count*100).toFixed(4),meanSignedRGB:signed.map(v=>+(v/(count/3)).toFixed(4))};
        }
        variants.push({id:result.id,metrics});
    }
    analysis.push({backend:report.backend,shot:report.shot,note:'8-bit output pixel differences, not a perceptual quality score. Baseline repeat measures capture noise.',variants});
}
await writeFile(new URL('quality-analysis.json',dir),JSON.stringify(analysis,null,2));
console.log(JSON.stringify(analysis,null,2));
