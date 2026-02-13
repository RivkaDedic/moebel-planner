import { useState, useEffect, useRef } from "react";

const COLORS = ["#4A90D9","#7EC87E","#E8A838","#D94A4A","#9B6DC6","#4ABFBF","#D97BA0","#8B7355"];

const INITIAL = [
  { id:"1", name:"Bett", breite:2180, tiefe:2385, farbe:"#7EC87E" },
  { id:"2", name:"Kleiderschrank (groß)", breite:750, tiefe:600, farbe:"#9B6DC6" },
  { id:"3", name:"Kleiderschrank (klein)", breite:500, tiefe:600, farbe:"#9B6DC6" },
  { id:"4", name:"Billy", breite:800, tiefe:280, farbe:"#D94A4A" },
  { id:"5", name:"Flurkommode", breite:885, tiefe:315, farbe:"#D97BA0" },
  { id:"6", name:"Flori Bett", breite:2310, tiefe:1025, farbe:"#4ABFBF" },
  { id:"7", name:"Leiter", breite:460, tiefe:630, farbe:"#8B7355" },
  { id:"8", name:"Kallax 3×4", breite:1120, tiefe:400, farbe:"#E8A838" },
  { id:"9", name:"Kallax 1×4", breite:1470, tiefe:400, farbe:"#E8A838" },
  { id:"10", name:"Minibilly", breite:200, tiefe:170, farbe:"#D94A4A" },
  { id:"11", name:"Schrank weiß", breite:600, tiefe:420, farbe:"#4A90D9" },
];

const hexToRgb = (h) => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const lighten = (rgb,f=0.7) => rgb.map(c=>Math.round(c*(1-f)+255*f));

let _jsPDF = null;
const getJsPDF = () => new Promise((res,rej) => {
  if (_jsPDF) return res(_jsPDF);
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  s.onload = () => { _jsPDF = window.jspdf.jsPDF; res(_jsPDF); };
  s.onerror = () => rej(new Error("jsPDF konnte nicht geladen werden"));
  document.head.appendChild(s);
});

// === PDF: Möbelvorlagen ===
async function genFurniturePDF(items, scale) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const pw = 210, ph = 297, mg = 15, sp = 6;
  const toMM = (realMM) => realMM / scale;
  let page = 1, cx = mg + 6, cy = mg + 14, rowH = 0;

  const header = (p) => {
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.setTextColor(50,50,50);
    doc.text(`Möbel-Vorlagen · Maßstab 1:${scale}`, mg, mg + 4);
    doc.setFont("helvetica","normal"); doc.setFontSize(6);
    doc.setTextColor(130,130,130);
    doc.text(`Gestrichelte Linie = Schnittlinie · 1 cm echt = ${(10/scale).toFixed(1)} mm auf Papier`, mg, mg + 8);
    doc.text(`Seite ${p}`, pw - mg, mg + 4, { align:"right" });
  };

  const drawPiece = (x, y, name, bMM, tMM, color) => {
    const w = toMM(bMM), h = toMM(tMM);
    const rgb = hexToRgb(color), light = lighten(rgb, 0.75);
    const cm = 1.2, dm = 5;

    // Fill
    doc.setFillColor(...light); doc.setDrawColor(...rgb); doc.setLineWidth(0.3);
    doc.rect(x, y, w, h, "FD");

    // Cut line (dashed)
    doc.setDrawColor(150,150,150); doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.5,1.5],0);
    doc.rect(x-cm, y-cm, w+2*cm, h+2*cm);
    doc.setLineDashPattern([],0);

    // Cut marks
    const mk = 2.5;
    doc.setDrawColor(0); doc.setLineWidth(0.2);
    [[x-cm,y-cm,-1,-1],[x+w+cm,y-cm,1,-1],[x+w+cm,y+h+cm,1,1],[x-cm,y+h+cm,-1,1]].forEach(([cx2,cy2,dx,dy])=>{
      doc.line(cx2,cy2,cx2+dx*mk,cy2); doc.line(cx2,cy2,cx2,cy2+dy*mk);
    });

    // Label
    const bCM = (bMM/10).toFixed(1).replace(/\.0$/,"");
    const tCM = (tMM/10).toFixed(1).replace(/\.0$/,"");
    const label = name;
    const dims = `${bCM} × ${tCM} cm`;
    let fs = 7;
    doc.setFont("helvetica","bold");
    while (fs > 4 && doc.getTextWidth(label) * fs/7 > w - 2) fs -= 0.5;
    doc.setFontSize(fs); doc.setTextColor(40,40,40);
    const lw = doc.getTextWidth(label);
    doc.text(label, x + w/2, y + h/2 - 0.5, { align:"center" });
    doc.setFont("helvetica","normal"); doc.setFontSize(Math.min(fs-1, 5.5));
    doc.setTextColor(90,90,90);
    doc.text(dims, x + w/2, y + h/2 + fs*0.4, { align:"center" });

    // Dimension: bottom (breite)
    const dy2 = h + cm + dm;
    doc.setDrawColor(100,100,100); doc.setLineWidth(0.2);
    doc.line(x, y + dy2, x + w, y + dy2);
    doc.line(x, y + dy2 - 1, x, y + dy2 + 1);
    doc.line(x + w, y + dy2 - 1, x + w, y + dy2 + 1);
    // extension lines
    doc.setLineDashPattern([0.8,0.8],0);
    doc.line(x, y + h + cm + 0.5, x, y + dy2 + 1.5);
    doc.line(x+w, y + h + cm + 0.5, x+w, y + dy2 + 1.5);
    doc.setLineDashPattern([],0);
    doc.setFontSize(5); doc.setTextColor(80,80,80);
    doc.text(`${bCM} cm`, x + w/2, y + dy2 + 2.5, { align:"center" });

    // Dimension: right (tiefe)
    const dx2 = w + cm + dm;
    doc.setDrawColor(100,100,100);
    doc.line(x + dx2, y, x + dx2, y + h);
    doc.line(x + dx2 - 1, y, x + dx2 + 1, y);
    doc.line(x + dx2 - 1, y+h, x + dx2 + 1, y+h);
    doc.setLineDashPattern([0.8,0.8],0);
    doc.line(x + w + cm + 0.5, y, x + dx2 + 1.5, y);
    doc.line(x + w + cm + 0.5, y+h, x + dx2 + 1.5, y+h);
    doc.setLineDashPattern([],0);
    // rotated text
    doc.saveGraphicsState();
    const tx = x + dx2 + 2.5, ty2 = y + h/2;
    doc.text(`${tCM} cm`, tx, ty2, { angle: 90, align:"center" });
    doc.restoreGraphicsState();

    return { tw: w + 2*cm + dm + 4, th: h + 2*cm + dm + 4 };
  };

  header(page);
  for (const item of items) {
    const w = toMM(item.breite), h = toMM(item.tiefe);
    const tw = w + 2*1.2 + 5 + 4, th = h + 2*1.2 + 5 + 4;

    if (cx + tw > pw - mg) { cx = mg + 6; cy += rowH + sp; rowH = 0; }
    if (cy + th > ph - mg) {
      doc.addPage(); page++; header(page);
      cx = mg + 6; cy = mg + 14; rowH = 0;
    }
    const dx = cx + 1.2 + 0.5, dy = cy + 1.2 + 0.5;
    drawPiece(dx, dy, item.name, item.breite, item.tiefe, item.farbe || COLORS[0]);
    cx += tw + sp;
    rowH = Math.max(rowH, th);
  }

  doc.save("moebel_vorlagen.pdf");
}

// === PDF: Rasterblatt ===
async function genGridPDF(scale, landscape) {
  const jsPDF = await getJsPDF();
  const orient = landscape ? "landscape" : "portrait";
  const doc = new jsPDF({ unit:"mm", format:"a4", orientation: orient });
  const pw = landscape ? 297 : 210, ph = landscape ? 210 : 297;
  const mg = 15;
  const gx = mg, gy = mg + 12;
  const gw = pw - 2*mg, gh = ph - mg - gy;

  // Header
  const realW = (gw * scale / 10).toFixed(0), realH = (gh * scale / 10).toFixed(0);
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(50,50,50);
  doc.text(`Rasterblatt · Maßstab 1:${scale}`, mg, mg + 4);
  doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(130,130,130);
  doc.text(`Raster = 1m · Feines Raster = 10cm · Bereich: ${realW}×${realH} cm (${(realW/100).toFixed(1)}×${(realH/100).toFixed(1)} m) · ${landscape?"Querformat":"Hochformat"}`, mg, mg + 8);

  const step10 = 100 / scale;   // 10cm
  const step50 = 500 / scale;   // 50cm
  const step1m = 1000 / scale;  // 1m

  // 10cm grid
  doc.setDrawColor(225,225,225); doc.setLineWidth(0.1);
  for (let x = gx; x <= gx+gw+0.1; x += step10) doc.line(x,gy,x,gy+gh);
  for (let y = gy; y <= gy+gh+0.1; y += step10) doc.line(gx,y,gx+gw,y);

  // 50cm grid
  doc.setDrawColor(195,195,195); doc.setLineWidth(0.15);
  for (let x = gx; x <= gx+gw+0.1; x += step50) doc.line(x,gy,x,gy+gh);
  for (let y = gy; y <= gy+gh+0.1; y += step50) doc.line(gx,y,gx+gw,y);

  // 1m grid
  doc.setDrawColor(120,120,120); doc.setLineWidth(0.35);
  let m = 0;
  for (let x = gx; x <= gx+gw+0.1; x += step1m) {
    doc.line(x,gy,x,gy+gh);
    if (m > 0) {
      doc.setFontSize(5); doc.setTextColor(100,100,100);
      doc.text(`${m}m`, x, gy - 1.5, { align:"center" });
    }
    m++;
  }
  m = 0;
  for (let y = gy; y <= gy+gh+0.1; y += step1m) {
    doc.line(gx,y,gx+gw,y);
    if (m > 0) {
      doc.setFontSize(5); doc.setTextColor(100,100,100);
      doc.text(`${m}m`, gx - 2, y + 1, { align:"right" });
    }
    m++;
  }

  // Border
  doc.setDrawColor(50,50,50); doc.setLineWidth(0.5);
  doc.rect(gx, gy, gw, gh);

  // Scale bar
  const bx = gx + gw - step1m - 3, by = gy + gh + 5;
  doc.setDrawColor(60,60,60); doc.setLineWidth(0.6);
  doc.line(bx, by, bx + step1m, by);
  doc.line(bx, by-1.2, bx, by+1.2);
  doc.line(bx+step1m, by-1.2, bx+step1m, by+1.2);
  doc.setFontSize(5.5); doc.setTextColor(60,60,60);
  doc.text("1 Meter", bx + step1m/2, by + 3, { align:"center" });

  doc.save(`rasterblatt_${landscape?"quer":"hoch"}.pdf`);
}

// === Icons ===
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>;
const IconTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
const IconFile = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>;
const IconGrid = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
const IconUpload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>;

// === Main Component ===
export default function MoebelPlanner() {
  const [items, setItems] = useState([]);
  const [scale, setScale] = useState(25);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:"", breite:"", tiefe:"", farbe:COLORS[0] });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef(null);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("moebel-planner-v1");
      if (saved) {
        const d = JSON.parse(saved);
        if (d.items?.length) setItems(d.items);
        else setItems(INITIAL);
        if (d.scale) setScale(d.scale);
      } else { setItems(INITIAL); }
    } catch { setItems(INITIAL); }
    setLoaded(true);
  }, []);

  // Save to storage
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("moebel-planner-v1", JSON.stringify({items,scale})); } catch {}
  }, [items, scale, loaded]);
  const flash = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2500); };

  const addItem = () => {
    const b = parseFloat(form.breite), t = parseFloat(form.tiefe);
    if (!form.name.trim() || isNaN(b) || isNaN(t) || b<=0 || t<=0) {
      flash("Bitte Name, Breite und Tiefe angeben"); return;
    }
    if (editing) {
      setItems(items.map(i => i.id===editing ? {...i, name:form.name.trim(), breite:b, tiefe:t, farbe:form.farbe} : i));
      setEditing(null);
    } else {
      setItems([...items, { id: Date.now().toString(), name:form.name.trim(), breite:b, tiefe:t, farbe:form.farbe }]);
    }
    setForm({ name:"", breite:"", tiefe:"", farbe:COLORS[(items.length+1) % COLORS.length] });
  };

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({ name:item.name, breite:item.breite.toString(), tiefe:item.tiefe.toString(), farbe:item.farbe||COLORS[0] });
  };

  const cancelEdit = () => { setEditing(null); setForm({ name:"",breite:"",tiefe:"",farbe:COLORS[items.length%COLORS.length] }); };

  const removeItem = (id) => { setItems(items.filter(i=>i.id!==id)); if(editing===id) cancelEdit(); };

  const exportJSON = () => {
    const data = { massstab:scale, moebel: items.map(({name,breite,tiefe,farbe})=>({name,breite,tiefe,farbe})) };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "moebel.json"; a.click();
  };

  const importJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        const list = d.moebel || (Array.isArray(d) ? d : []);
        setItems(list.map((m,i) => ({...m, id: Date.now().toString()+i})));
        if (d.massstab) setScale(d.massstab);
        flash(`${list.length} Möbel importiert`);
      } catch { flash("Fehler beim Lesen der Datei"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const handlePDF = async (fn, ...args) => {
    setBusy(true);
    try { await fn(...args); flash("PDF erstellt ✓"); }
    catch(e) { flash("Fehler: " + e.message); }
    finally { setBusy(false); }
  };

  const maxB = Math.max(...items.map(i=>i.breite),1);

  return (
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#f5f5f0",minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:"#1a1a1a",color:"#f5f5f0",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,letterSpacing:"-0.02em"}}>Möbel-Planer</div>
          <div style={{fontSize:11,color:"#999",fontFamily:"'DM Mono',monospace"}}>Maßstabsgetreue 2D-Vorlagen</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,color:"#aaa"}}>Maßstab</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:15}}>1:{scale}</span>
          <input type="range" min={15} max={50} value={scale}
            onChange={e=>setScale(+e.target.value)}
            style={{width:100,accentColor:"#E8A838"}} />
          <span style={{fontSize:11,color:"#777",fontFamily:"'DM Mono',monospace"}}>
            1cm = {(10/scale).toFixed(2)}mm
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && <div style={{position:"fixed",top:12,right:12,background:"#1a1a1a",color:"#f5f5f0",padding:"8px 16px",borderRadius:6,fontSize:13,zIndex:999,boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>{toast}</div>}

      <div style={{maxWidth:900,margin:"0 auto",padding:"16px 16px 60px"}}>

        {/* Add/Edit Form */}
        <div style={{background:"#fff",borderRadius:8,padding:16,marginBottom:16,border:"1px solid #e0e0d8",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"#555"}}>
            {editing ? "✏️ Möbelstück bearbeiten" : "➕ Neues Möbelstück"}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"end"}}>
            <div style={{flex:"1 1 160px"}}>
              <label style={lblStyle}>Name</label>
              <input style={inputStyle} placeholder="z.B. Sofa" value={form.name}
                onChange={e=>setForm({...form,name:e.target.value})}
                onKeyDown={e=>e.key==="Enter"&&addItem()} />
            </div>
            <div style={{flex:"0 1 110px"}}>
              <label style={lblStyle}>Breite (mm)</label>
              <input style={inputStyle} type="number" placeholder="1200" value={form.breite}
                onChange={e=>setForm({...form,breite:e.target.value})}
                onKeyDown={e=>e.key==="Enter"&&addItem()} />
            </div>
            <div style={{flex:"0 1 110px"}}>
              <label style={lblStyle}>Tiefe (mm)</label>
              <input style={inputStyle} type="number" placeholder="800" value={form.tiefe}
                onChange={e=>setForm({...form,tiefe:e.target.value})}
                onKeyDown={e=>e.key==="Enter"&&addItem()} />
            </div>
            <div style={{flex:"0 0 50px"}}>
              <label style={lblStyle}>Farbe</label>
              <input type="color" value={form.farbe} onChange={e=>setForm({...form,farbe:e.target.value})}
                style={{width:42,height:32,border:"1px solid #ddd",borderRadius:4,cursor:"pointer",padding:2}} />
            </div>
            <button onClick={addItem} style={{...btnStyle,background:"#1a1a1a",color:"#fff",height:32}}>
              {editing ? "Speichern" : <><IconPlus/> Hinzufügen</>}
            </button>
            {editing && <button onClick={cancelEdit} style={{...btnStyle,background:"#eee",color:"#555",height:32}}>Abbrechen</button>}
          </div>
        </div>

        {/* Item List */}
        <div style={{background:"#fff",borderRadius:8,border:"1px solid #e0e0d8",marginBottom:16,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
          <div style={{padding:"10px 16px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:600,color:"#555"}}>{items.length} Möbelstück{items.length!==1&&"e"}</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={exportJSON} style={{...btnSmall}} title="JSON exportieren"><IconDown/> JSON</button>
              <button onClick={()=>fileRef.current?.click()} style={{...btnSmall}} title="JSON importieren"><IconUpload/> Import</button>
              <input ref={fileRef} type="file" accept=".json" onChange={importJSON} hidden/>
            </div>
          </div>
          {items.length === 0 ? (
            <div style={{padding:32,textAlign:"center",color:"#aaa",fontSize:13}}>Keine Möbel vorhanden. Füge welche hinzu!</div>
          ) : (
            <div style={{maxHeight:400,overflowY:"auto"}}>
              {items.map((item,idx) => {
                const bCM = (item.breite/10).toFixed(1).replace(/\.0$/,"");
                const tCM = (item.tiefe/10).toFixed(1).replace(/\.0$/,"");
                const onPaperW = (item.breite/scale).toFixed(1);
                const onPaperH = (item.tiefe/scale).toFixed(1);
                const barW = Math.max(8, (item.breite/maxB)*100);
                return (
                  <div key={item.id} style={{
                    display:"flex", alignItems:"center", gap:10, padding:"8px 16px",
                    borderBottom:"1px solid #f0f0ea",
                    background: editing===item.id ? "#fffde8" : idx%2===0 ? "#fafaf7" : "#fff",
                    transition:"background 0.15s"
                  }}>
                    {/* Color + mini preview */}
                    <div style={{width:40,height:24,borderRadius:3,background:item.farbe||COLORS[0],opacity:0.7,
                      display:"flex",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0}}>
                      <div style={{
                        width: `${Math.max(30, (item.breite/Math.max(item.breite,item.tiefe))*100)}%`,
                        height: `${Math.max(30, (item.tiefe/Math.max(item.breite,item.tiefe))*100)}%`,
                        background:"rgba(255,255,255,0.5)", borderRadius:1
                      }}/>
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#333",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                      <div style={{fontSize:11,color:"#888",fontFamily:"'DM Mono',monospace"}}>
                        {bCM}×{tCM} cm <span style={{color:"#bbb"}}>→</span> {onPaperW}×{onPaperH} mm auf Papier
                      </div>
                    </div>
                    {/* Size bar */}
                    <div style={{width:100,flexShrink:0,display:"flex",alignItems:"center"}}>
                      <div style={{height:4,borderRadius:2,background:item.farbe||COLORS[0],opacity:0.4,width:`${barW}%`,transition:"width 0.3s"}}/>
                    </div>
                    {/* Actions */}
                    <button onClick={()=>startEdit(item)} style={{...iconBtn}} title="Bearbeiten"><IconEdit/></button>
                    <button onClick={()=>removeItem(item.id)} style={{...iconBtn,color:"#c44"}} title="Löschen"><IconTrash/></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PDF Actions */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
          <button onClick={()=>handlePDF(genFurniturePDF,items,scale)} disabled={busy||!items.length}
            style={{...btnAction,background:"#1a1a1a",color:"#fff",opacity:busy||!items.length?0.5:1}}>
            <IconFile/> Möbelvorlagen PDF
          </button>
          <button onClick={()=>handlePDF(genGridPDF,scale,false)} disabled={busy}
            style={{...btnAction,background:"#fff",color:"#333",border:"1px solid #ccc",opacity:busy?0.5:1}}>
            <IconGrid/> Raster Hochformat
          </button>
          <button onClick={()=>handlePDF(genGridPDF,scale,true)} disabled={busy}
            style={{...btnAction,background:"#fff",color:"#333",border:"1px solid #ccc",opacity:busy?0.5:1}}>
            <IconGrid/> Raster Querformat
          </button>
        </div>

        {/* Info */}
        <div style={{background:"#fff",borderRadius:8,padding:14,border:"1px solid #e0e0d8",fontSize:12,color:"#777",lineHeight:1.6}}>
          <strong style={{color:"#555"}}>Hinweise:</strong><br/>
          • Maße in <strong>mm</strong> eingeben (z.B. 2000 = 200cm = 2m)<br/>
          • Bei 1:{scale} deckt ein A4-Blatt ca. <strong>{((210-30)*scale/1000).toFixed(1)} × {((297-30)*scale/1000).toFixed(1)} m</strong> ab (Hochformat)<br/>
          • Für größere Räume: Querformat nutzen oder auf A3 drucken<br/>
          • Möbelliste wird automatisch gespeichert · JSON-Export für Backup
        </div>
      </div>
    </div>
  );
}

// Shared styles
const lblStyle = { fontSize:11, color:"#888", display:"block", marginBottom:2, fontWeight:500 };
const inputStyle = {
  width:"100%", padding:"6px 8px", border:"1px solid #ddd", borderRadius:4,
  fontSize:13, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box",
};
const btnStyle = {
  display:"inline-flex", alignItems:"center", gap:5, padding:"0 14px",
  borderRadius:5, border:"none", fontSize:13, fontWeight:600, cursor:"pointer",
  whiteSpace:"nowrap", transition:"opacity 0.15s",
};
const btnSmall = {
  display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px",
  borderRadius:4, border:"1px solid #ddd", background:"#fafaf7", fontSize:11,
  fontWeight:500, cursor:"pointer", color:"#666",
};
const iconBtn = {
  display:"inline-flex", alignItems:"center", justifyContent:"center",
  width:28, height:28, borderRadius:4, border:"none", background:"transparent",
  cursor:"pointer", color:"#888", flexShrink:0,
};
const btnAction = {
  display:"inline-flex", alignItems:"center", gap:6, padding:"10px 18px",
  borderRadius:6, border:"none", fontSize:13, fontWeight:600, cursor:"pointer",
  transition:"opacity 0.15s", boxShadow:"0 1px 3px rgba(0,0,0,0.1)",
};
