export default function PreviewPane({file,result}){
 const imageUrl=file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
 const boxes=result?.pages?.[0]?.boxes||[];
 return <div className="preview">{imageUrl?<div className="imageWrap"><img src={imageUrl}/><svg>{boxes.map((b,i)=>{const pts=b.box; if(!Array.isArray(pts)) return null; const flat=pts.flat(); const xs=flat.filter((_,i)=>i%2===0), ys=flat.filter((_,i)=>i%2===1); const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y; return <rect key={i} x={x} y={y} width={w} height={h}/>})}</svg></div>:<p>Preview PDF: {file?.name}. Kết quả được chia theo từng trang trong JSON.</p>}</div>
}
