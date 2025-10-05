export function slugify(s: string){
  return (s||"").toLowerCase().trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (d)=>String.fromCharCode(d.charCodeAt(0)-0xFEE0))
    .replace(/[^a-z0-9\-_]+/g, "-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}
