const zlib=require('node:zlib'),z=require('../app/src/main/assets/vendor/fflate/fflate.js'),P=require('../app/src/main/assets/arcanum-package.js');
module.exports=async function(manifest){
 const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0}),crc=data=>{let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0},chunk=(name,data)=>{const type=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(out.subarray(4,out.length-4)),out.length-4);return out};
 const width=1600,height=1600,rgba=Buffer.alloc((width*4+1)*height);let random=123456789;for(let y=0;y<height;y++)for(let x=0;x<width*4;x++){random^=random<<13;random^=random>>>17;random^=random<<5;rgba[y*(width*4+1)+x+1]=random&255}
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 const image=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rgba)),chunk('IEND',Buffer.alloc(0))]),attachment=new Uint8Array(8*1024*1024).fill(42);
 const value=structuredClone(manifest);value.items[0].assets=[{path:'image.png',name:'Synthetic image.png',kind:'image',mime:'image/png',size:image.length,sha256:await P.hash(image)},{path:'attachment.bin',name:'Synthetic attachment.bin',kind:'attachment',mime:'application/octet-stream',size:attachment.length,sha256:await P.hash(attachment)}];
 return {manifest:value,image,attachment,bytes:z.zipSync({'manifest.json':new TextEncoder().encode(JSON.stringify(value)),'image.png':image,'attachment.bin':attachment})};
};
