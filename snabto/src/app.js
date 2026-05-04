// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const TEAL        = "#0D9488";
const TEAL_LIGHT  = "#CCFBF1";
const TEAL_BG     = "#F0FDFA";
const GRAY        = "#6B7280";
const DARK        = "#111827";
const BORDER      = "#E5E7EB";

const CLEANING_SVCS = [
  { id:"sweep",    label:"Sweeping & Mopping", icon:"🧹" },
  { id:"dishes",   label:"Dish Washing",        icon:"🍽️" },
  { id:"clothes",  label:"Washing Clothes",     icon:"👕" },
  { id:"toilets",  label:"Cleaning Toilets",    icon:"🚽" },
  { id:"bathroom", label:"Cleaning Bathroom",   icon:"🚿" },
  { id:"food",     label:"Preparing Food",      icon:"🍳" },
];

const PER_UNIT = { dishes:40, clothes:60, food:100, toilets:80, bathroom:100 };

function calcBase(id, cfg) {
  if (id==="sweep") return (cfg.large||0)*180+(cfg.medium||0)*120+(cfg.small||0)*80;
  return (cfg.count||0)*(PER_UNIT[id]||0);
}
function applyPlan(base, plan) {
  if (plan==="monthly") return Math.round(base*26*0.8);
  if (plan==="yearly")  return Math.round(base*312*0.8);
  return base;
}
function planLabel(plan) {
  return plan==="monthly"?"monthly":plan==="yearly"?"yearly":"1-day";
}

const PLUMBER_SUGG  = ["Pipe leakage / burst pipe","Blocked drain or toilet","Low water pressure","Tap repair or replacement","Water heater issue","Geyser not working","Bathroom fitting issue","Kitchen sink blocked","Sewage overflow","Water meter problem"];
const ELEC_SUGG     = ["Power outage / tripped breaker","Fan not working","AC not working","Socket not working","Short circuit","Light fitting repair","Wiring fault","Inverter / UPS issue","CCTV / doorbell installation","New electrical point needed"];
const REPAIR_SUGG   = ["Engine not starting","Brake issue","Battery dead","Oil change needed","Tyre change","AC not working","Gear problem","Clutch issue","Headlight repair","Fuel pump issue"];

const INIT_BOOKINGS = [
  { id:"B1", service:"House Cleaning", plan:"Monthly", subServices:"Sweeping & Mopping, Dish Washing",                             date:"03 May 2026", status:"confirmed", price:176, validTill:"02 Jun 2026" },
  { id:"B2", service:"House Cleaning", plan:"Monthly", subServices:"Sweeping & Mopping, Dish Washing, Cleaning Toilets, Preparing Food", date:"03 May 2026", status:"confirmed", price:896, validTill:"02 Jun 2026" },
  { id:"B3", service:"Plumber",        plan:"1 Day",   subServices:"Problem Description",                                          date:"02 May 2026", status:"confirmed", price:299, validTill:"02 May 2026" },
  { id:"B4", service:"House Cleaning", plan:"Monthly", subServices:"Sweeping & Mopping",                                           date:"01 May 2026", status:"confirmed", price:144, validTill:"31 May 2026" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function el(tag, props, ...children) {
  return React.createElement(tag, props, ...children);
}
function useState(init) { return React.useState(init); }

// ─── CSS-in-JS via style injection ────────────────────────────────────────────
const globalStyle = document.createElement("style");
globalStyle.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #E5E7EB; font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  button { font-family: inherit; cursor: pointer; }
  input, textarea { font-family: inherit; }
  .snabto-name { font-family: 'Nunito', 'Varela Round', -apple-system, sans-serif; font-weight: 800; color: ${TEAL}; letter-spacing: -0.3px; }
  .scroll-area { overflow-y: auto; flex: 1; padding: 16px 18px 110px; }
  .booking-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  .fade-in { animation: fadeIn 0.2s ease; }
`;
document.head.appendChild(globalStyle);

// Also load Nunito font
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap";
document.head.appendChild(fontLink);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen]           = React.useState("onboard");
  const [tab, setTab]                 = React.useState("home");
  const [location, setLocation]       = React.useState("");
  const [phone, setPhone]             = React.useState("");
  const [locLoading, setLocLoading]   = React.useState(false);
  const [bookings, setBookings]       = React.useState(INIT_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = React.useState(null);

  const [catId, setCatId]             = React.useState(null);
  const [plan, setPlan]               = React.useState(null);
  const [multiSel, setMultiSel]       = React.useState([]);
  const [multiCfg, setMultiCfg]       = React.useState({});
  const [singleSvc, setSingleSvc]     = React.useState(null);
  const [singleCfg, setSingleCfg]     = React.useState({});
  const [problemText, setProblemText] = React.useState("");
  const [problemFilt, setProblemFilt] = React.useState([]);

  const [checkoutData, setCheckoutData] = React.useState(null);
  const [orderDone, setOrderDone]       = React.useState(false);
  const [feedback, setFeedback]         = React.useState({ rating:0, comment:"" });
  const [fbDone, setFbDone]             = React.useState(false);

  function getLive() {
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const d = await r.json();
          const parts = [d.address?.suburb||d.address?.neighbourhood, d.address?.city||d.address?.town, d.address?.state].filter(Boolean);
          setLocation(parts.join(", ") || d.display_name);
        } catch { setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); }
        setLocLoading(false);
      },
      () => { alert("Could not get location. Please type your address."); setLocLoading(false); }
    );
  }

  function resetNav() { setCatId(null); setPlan(null); setMultiSel([]); setMultiCfg({}); setSingleSvc(null); setSingleCfg({}); setProblemText(""); setProblemFilt([]); }
  function switchTab(t) { setTab(t); resetNav(); setSelectedBooking(null); }

  function toggleMulti(id) { setMultiSel(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]); }
  function updateMC(id, key, val) { setMultiCfg(p => ({ ...p, [id]: { ...(p[id]||{}), [key]: val } })); }
  function getMultiTotal() { return multiSel.reduce((s,id) => s + applyPlan(calcBase(id, multiCfg[id]||{}), plan), 0); }

  function buildCheckout(service, planStr, subServices, price) {
    const vd = new Date();
    if (planStr==="monthly") vd.setDate(vd.getDate()+30);
    else if (planStr==="yearly") vd.setDate(vd.getDate()+365);
    else vd.setDate(vd.getDate()+1);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return { service, plan: planStr==="1day"?"1 Day":planStr==="monthly"?"Monthly":"Yearly", subServices,
      address: location.slice(0,30), phone, price,
      validTill: `${String(vd.getDate()).padStart(2,"0")} ${months[vd.getMonth()]} ${vd.getFullYear()}` };
  }

  function proceedMulti() {
    const sub = multiSel.map(id=>CLEANING_SVCS.find(s=>s.id===id).label).join(", ");
    setCheckoutData(buildCheckout("House Cleaning", plan, sub, getMultiTotal()));
  }

  function proceedSingle() {
    const svc = CLEANING_SVCS.find(s=>s.id===singleSvc);
    setCheckoutData(buildCheckout("House Cleaning", plan, svc.label, applyPlan(calcBase(singleSvc, singleCfg), plan)));
  }

  function confirmPayment() {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const today  = new Date();
    const newB = { id:"B"+Date.now(), service:checkoutData.service, plan:checkoutData.plan,
      subServices:checkoutData.subServices,
      date:`${String(today.getDate()).padStart(2,"0")} ${months[today.getMonth()]} ${today.getFullYear()}`,
      status:"confirmed", price:checkoutData.price, validTill:checkoutData.validTill };
    setBookings(p=>[newB,...p]);
    setOrderDone(true);
  }

  // ── ONBOARDING ───────────────────────────────────────────────────────────────
  if (screen==="onboard") return (
    React.createElement(Shell, null,
      React.createElement("div", { style:{padding:"48px 24px 40px",display:"flex",flexDirection:"column",flex:1} },
        // Logo
        React.createElement("div", { style:{textAlign:"center",marginBottom:32} },
          React.createElement("img", { src:IMGS.logo, alt:"Snabto", style:{width:80,height:80,borderRadius:20,marginBottom:12} }),
          React.createElement("h1", { className:"snabto-name", style:{fontSize:34,display:"block"} }, "Snabto"),
          React.createElement("p", { style:{color:GRAY,fontSize:14,marginTop:4} }, "Home services at your doorstep")
        ),
        // Location field
        React.createElement("label", { style:S.label }, "Your Location *"),
        React.createElement("div", { style:{position:"relative"} },
          React.createElement("input", { style:{...S.input,paddingLeft:36,paddingRight:60}, placeholder:"Enter your area / city",
            value:location, onChange:e=>setLocation(e.target.value) }),
          React.createElement("span", { style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:16,color:TEAL} }, "📍"),
          React.createElement("button", { style:{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:TEAL_BG,border:"none",borderRadius:8,padding:"4px 8px",fontSize:11,fontWeight:700,color:TEAL,cursor:"pointer"},
            onClick:getLive }, locLoading ? "⏳" : "📍 Live")
        ),
        locLoading && React.createElement("p", { style:{fontSize:12,color:TEAL,marginTop:4} }, "Detecting location…"),
        // Phone field
        React.createElement("label", { style:{...S.label,marginTop:16} }, "Mobile Number *"),
        React.createElement("input", { style:S.input, placeholder:"10-digit mobile number", type:"tel",
          value:phone, onChange:e=>setPhone(e.target.value) }),
        // CTA
        React.createElement("button", { style:{...S.primaryBtn,marginTop:28},
          onClick:()=>{ if(location&&phone) setScreen("main"); else alert("Please fill both fields."); }
        }, "Continue →"),
        React.createElement("div", { style:{textAlign:"center",marginTop:16} },
          React.createElement("button", { style:S.linkBtn, onClick:()=>{ setScreen("main"); setTab("maid"); } },
            "Join as a Maid / Worker")
        )
      )
    )
  );

  // ── CHECKOUT ─────────────────────────────────────────────────────────────────
  if (checkoutData && !orderDone) return (
    React.createElement(Shell, null,
      React.createElement(TopBar, { loc:location }),
      React.createElement("div", { className:"scroll-area" },
        !orderDone && React.createElement("div", { className:"fade-in" },
          // Summary table
          React.createElement("div", { style:{background:"#F3F4F6",borderRadius:14,padding:"18px 16px",marginBottom:18} },
            [["Service",checkoutData.service],["Plan",checkoutData.plan],
             ["Sub-service",checkoutData.subServices],["Address",checkoutData.address],
             ["Phone",checkoutData.phone],["Valid till",checkoutData.validTill]
            ].map(([k,v]) =>
              React.createElement("div", { key:k, style:{display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"flex-start"} },
                React.createElement("span", { style:{color:GRAY,fontSize:14,minWidth:90} }, k),
                React.createElement("span", { style:{fontSize:14,fontWeight:500,color:DARK,textAlign:"right",maxWidth:200,lineHeight:1.4} }, v)
              )
            )
          ),
          // Total
          React.createElement("div", { style:{border:`1.5px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:18} },
            React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"center"} },
              React.createElement("span", { style:{fontSize:16,fontWeight:700,color:DARK} }, "Total Amount"),
              React.createElement("span", { style:{fontSize:26,fontWeight:900,color:TEAL} }, `₹${checkoutData.price}`)
            )
          ),
          // UPI
          React.createElement("div", { style:{border:`1.5px solid #DBEAFE`,borderRadius:14,padding:"14px 16px",marginBottom:24,background:"#EFF6FF",display:"flex",gap:12,alignItems:"center"} },
            React.createElement("span", { style:{fontSize:22} }, "📱"),
            React.createElement("div", null,
              React.createElement("div", { style:{fontWeight:600,fontSize:14,color:DARK} }, "Pay via UPI only"),
              React.createElement("div", { style:{fontSize:12,color:GRAY} }, "GPay, PhonePe, Paytm, BHIM or any UPI app")
            )
          ),
          React.createElement("button", { style:S.primaryBtn, onClick:confirmPayment }, `Proceed to Pay ₹${checkoutData.price}`),
          React.createElement("button", { style:S.ghostBtn, onClick:()=>setCheckoutData(null) }, "← Go Back")
        )
      ),
      React.createElement(BottomNav, { tab, setTab:switchTab })
    )
  );

  // ── ORDER SUCCESS ─────────────────────────────────────────────────────────────
  if (orderDone) return (
    React.createElement(Shell, null,
      React.createElement(TopBar, { loc:location }),
      React.createElement("div", { className:"scroll-area" },
        React.createElement("div", { className:"fade-in" },
          !fbDone
          ? React.createElement("div", null,
              React.createElement("div", { style:{textAlign:"center",marginBottom:24} },
                React.createElement("div", { style:{fontSize:56} }, "✅"),
                React.createElement("h2", { style:{fontSize:22,fontWeight:800,color:DARK,margin:"12px 0 6px"} }, "Booking Confirmed!"),
                React.createElement("p", { style:{color:GRAY,fontSize:14} }, `Our professional will reach you at ${location.split(",")[0]}`)
              ),
              React.createElement("p", { style:{fontWeight:600,fontSize:14,marginBottom:10} }, "Rate your experience:"),
              React.createElement("div", { style:{display:"flex",gap:10,justifyContent:"center",fontSize:32,marginBottom:14} },
                [1,2,3,4,5].map(n =>
                  React.createElement("span", { key:n, style:{cursor:"pointer",opacity:feedback.rating>=n?1:0.25},
                    onClick:()=>setFeedback(p=>({...p,rating:n})) }, "⭐")
                )
              ),
              React.createElement("textarea", { style:{...S.input,height:80,resize:"none"}, placeholder:"Write a comment (optional)",
                value:feedback.comment, onChange:e=>setFeedback(p=>({...p,comment:e.target.value})) }),
              React.createElement("button", { style:{...S.primaryBtn,marginTop:16}, onClick:()=>setFbDone(true) }, "Submit Feedback"),
              React.createElement("button", { style:S.ghostBtn, onClick:()=>setFbDone(true) }, "Skip")
            )
          : React.createElement("div", { style:{textAlign:"center"} },
              React.createElement("div", { style:{fontSize:56} }, "🎉"),
              React.createElement("h2", { style:{fontSize:22,fontWeight:800,color:DARK,margin:"12px 0 6px"} }, "Thank You!"),
              React.createElement("p", { style:{color:GRAY,fontSize:14} }, "Your booking is saved in My Bookings."),
              React.createElement("button", { style:{...S.primaryBtn,marginTop:24},
                onClick:()=>{ setCheckoutData(null); setOrderDone(false); setFeedback({rating:0,comment:""}); setFbDone(false); resetNav(); setTab("home"); }
              }, "Back to Home")
            )
        )
      ),
      React.createElement(BottomNav, { tab, setTab:switchTab })
    )
  );

  // ── MAIN SCREEN ───────────────────────────────────────────────────────────────
  return (
    React.createElement(Shell, null,
      React.createElement(TopBar, { loc:location }),
      React.createElement("div", { className:"scroll-area" },

        // HOME
        !catId && tab==="home" && React.createElement(HomeTab, { loc:location, onSelect:id=>setCatId(id) }),

        // CLEANING: plan
        catId==="cleaning" && !plan && tab==="home" && React.createElement(PlanSelector, { onBack:resetNav, onSelect:setPlan }),

        // 1-DAY: pick service
        catId==="cleaning" && plan==="1day" && !singleSvc && tab==="home" &&
          React.createElement(ServiceListView, { title:"1-Day Cleaning", subtitle:"Standard pricing", onBack:()=>setPlan(null),
            onSelect:id=>{ setSingleSvc(id); setSingleCfg({}); } }),

        // 1-DAY: configure
        catId==="cleaning" && plan==="1day" && singleSvc && tab==="home" &&
          React.createElement(SingleConfig, { svcId:singleSvc, cfg:singleCfg, plan,
            onBack:()=>setSingleSvc(null),
            onChange:(k,v)=>setSingleCfg(p=>({...p,[k]:v})),
            onProceed:proceedSingle }),

        // MONTHLY/YEARLY: pick services
        catId==="cleaning" && (plan==="monthly"||plan==="yearly") && multiSel.length===0 && tab==="home" &&
          React.createElement(ServiceListView, { title:"Choose Services",
            subtitle:`${plan==="monthly"?"Monthly":"Yearly"} Plan — Select multiple, save 20%`, onBack:()=>setPlan(null),
            multiMode:true, selected:multiSel, onToggle:toggleMulti }),

        // MONTHLY/YEARLY: configure
        catId==="cleaning" && (plan==="monthly"||plan==="yearly") && multiSel.length>0 && tab==="home" &&
          React.createElement(MultiConfig, { selected:multiSel, cfg:multiCfg, plan,
            onToggle:toggleMulti, onChange:updateMC, total:getMultiTotal(),
            onProceed:proceedMulti, onBack:()=>setMultiSel([]) }),

        // CAR WASH
        catId==="carwash" && tab==="home" &&
          React.createElement(CarWashView, { onBack:resetNav,
            onSelect:(label,price,planStr)=>setCheckoutData(buildCheckout("Car Washing",planStr,label,price)) }),

        // PLUMBER
        catId==="plumber" && tab==="home" &&
          React.createElement(ProblemView, { title:"Plumber Service", emoji:"🔧", suggestions:PLUMBER_SUGG, price:299,
            text:problemText, filtered:problemFilt,
            onText:t=>{ setProblemText(t); setProblemFilt(t.length>1?PLUMBER_SUGG.filter(s=>s.toLowerCase().includes(t.toLowerCase())):[]) },
            onSugg:s=>{ setProblemText(s); setProblemFilt([]); },
            onBack:resetNav, onBook:()=>setCheckoutData(buildCheckout("Plumber","1day",problemText||"Problem Description",299)) }),

        // REPAIR
        catId==="repair" && tab==="home" &&
          React.createElement(ProblemView, { title:"Car / Bike Repair", emoji:"🔩", suggestions:REPAIR_SUGG, price:399,
            text:problemText, filtered:problemFilt,
            onText:t=>{ setProblemText(t); setProblemFilt(t.length>1?REPAIR_SUGG.filter(s=>s.toLowerCase().includes(t.toLowerCase())):[]) },
            onSugg:s=>{ setProblemText(s); setProblemFilt([]); },
            onBack:resetNav, onBook:()=>setCheckoutData(buildCheckout("Car/Bike Repair","1day",problemText||"Problem Description",399)) }),

        // PUNCTURE
        catId==="puncture" && tab==="home" &&
          React.createElement(PunctureView, { onBack:resetNav,
            onSelect:(label,price)=>setCheckoutData(buildCheckout("Puncture Fix","1day",label,price)) }),

        // ELECTRICIAN
        catId==="electrician" && tab==="home" &&
          React.createElement(ProblemView, { title:"Electrician Service", emoji:"⚡", suggestions:ELEC_SUGG, price:249,
            text:problemText, filtered:problemFilt,
            onText:t=>{ setProblemText(t); setProblemFilt(t.length>1?ELEC_SUGG.filter(s=>s.toLowerCase().includes(t.toLowerCase())):[]) },
            onSugg:s=>{ setProblemText(s); setProblemFilt([]); },
            onBack:resetNav, onBook:()=>setCheckoutData(buildCheckout("Electrician","1day",problemText||"Problem Description",249)) }),

        // BOOKINGS LIST
        tab==="bookings" && !selectedBooking &&
          React.createElement(BookingsList, { bookings, onSelect:setSelectedBooking }),

        // BOOKING DETAIL
        tab==="bookings" && selectedBooking &&
          React.createElement(BookingDetail, { booking:selectedBooking, onBack:()=>setSelectedBooking(null) }),

        // MAID
        tab==="maid" && React.createElement(MaidPortal, null),

        // HELP
        tab==="help" && React.createElement(HelplineTab, null)
      ),
      React.createElement(BottomNav, { tab, setTab:switchTab })
    )
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ loc, onSelect }) {
  const services = [
    { id:"cleaning",    label:"House Cleaning",    sub:"Sweeping, mopping & more", from:80,  rating:"4.9",reviews:"27k",badge:"Most Popular",badgeColor:TEAL },
    { id:"carwash",     label:"Car Washing",        sub:"Daily & monthly wash",     from:99,  rating:"4.8",reviews:"12k",badge:null },
    { id:"plumber",     label:"Plumber",            sub:"Leaks, pipes & drains",    from:299, rating:"4.7",reviews:"8k", badge:null },
    { id:"repair",      label:"Car/Bike Repair",    sub:"At-home vehicle repair",   from:399, rating:"4.8",reviews:"5k", badge:null },
    { id:"puncture",    label:"Puncture Fix",       sub:"Bike ₹119 • Car ₹199",   from:119, rating:"4.9",reviews:"15k",badge:"Fast Fix",badgeColor:"#EF4444" },
    { id:"electrician", label:"Electrician",        sub:"Wiring, fans & switches",  from:249, rating:"4.8",reviews:"10k",badge:null },
  ];

  return React.createElement("div", { className:"fade-in" },
    // Location bar
    React.createElement("div", { style:{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",border:`1.5px solid ${BORDER}`,borderRadius:12,padding:"10px 14px",marginBottom:20} },
      React.createElement("div", { style:{display:"flex",alignItems:"center",gap:8} },
        React.createElement("span", { style:{color:TEAL,fontSize:16} }, "📍"),
        React.createElement("span", { style:{fontSize:14,fontWeight:600,color:DARK} }, loc.split(",")[0] || loc)
      ),
      React.createElement("button", { style:{background:"none",border:"none",fontSize:13,color:TEAL,fontWeight:600,cursor:"pointer"} }, "✏️ Change")
    ),
    React.createElement("h2", { style:{fontSize:22,fontWeight:800,color:DARK,margin:"0 0 4px"} }, "Services we offer"),
    React.createElement("p", { style:{fontSize:14,color:GRAY,margin:"0 0 16px"} }, "Trusted professionals at your doorstep 🏠"),
    // Grid of 6 cards (2 columns)
    React.createElement("div", { style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20} },
      services.map(s => React.createElement(ServiceCard, { key:s.id, s, onClick:()=>onSelect(s.id) }))
    ),
    // Trust bar
    React.createElement("div", { style:{background:TEAL_BG,borderRadius:14,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8} },
      [["🛡️","Verified","Professionals"],["⚡","Same Day","Service"],["💯","100%","Satisfaction"]].map(([icon,label,sub]) =>
        React.createElement("div", { key:label, style:{textAlign:"center"} },
          React.createElement("div", { style:{fontSize:22} }, icon),
          React.createElement("div", { style:{fontSize:12,fontWeight:700,color:DARK,marginTop:4} }, label),
          React.createElement("div", { style:{fontSize:11,color:GRAY} }, sub)
        )
      )
    )
  );
}

// ─── SERVICE CARD (image fixed: just one background on the card image div) ────
function ServiceCard({ s, onClick }) {
  return React.createElement("button", {
    onClick,
    style:{background:"#fff",border:`1.5px solid ${BORDER}`,borderRadius:14,overflow:"hidden",textAlign:"left",cursor:"pointer",padding:0,display:"flex",flexDirection:"column",width:"100%"}
  },
    // Image container — single background-image, no inner div overlay conflict
    React.createElement("div", {
      style:{
        height:108,
        position:"relative",
        overflow:"hidden",
        borderRadius:"12px 12px 0 0",
        backgroundImage:`url(${IMGS[s.id]})`,
        backgroundSize:"cover",
        backgroundPosition:"center center",
        flexShrink:0,
      }
    },
      // Dark overlay for readability
      React.createElement("div", { style:{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 100%)"} }),
      // Badge
      s.badge && React.createElement("div", {
        style:{position:"absolute",top:8,left:8,background:s.badgeColor,color:"#fff",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,zIndex:2}
      }, s.badge),
      // Rating
      React.createElement("div", {
        style:{position:"absolute",bottom:7,right:7,background:"rgba(0,0,0,0.55)",borderRadius:20,padding:"2px 7px",fontSize:10,color:"#fff",fontWeight:600,zIndex:2}
      }, `⭐ ${s.rating} (${s.reviews})`)
    ),
    // Text content
    React.createElement("div", { style:{padding:"10px 10px 12px",flex:1} },
      React.createElement("div", { style:{fontSize:14,fontWeight:700,color:DARK,lineHeight:1.3} }, s.label),
      React.createElement("div", { style:{fontSize:11,color:GRAY,margin:"3px 0 8px",lineHeight:1.4} }, s.sub),
      React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"center"} },
        React.createElement("span", { style:{fontSize:13,fontWeight:600,color:DARK} },
          "From ", React.createElement("span", { style:{color:TEAL} }, `₹${s.from}`)
        ),
        React.createElement("div", { style:{width:26,height:26,borderRadius:"50%",background:TEAL,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,flexShrink:0} }, "→")
      )
    )
  );
}

// ─── PLAN SELECTOR ────────────────────────────────────────────────────────────
function PlanSelector({ onBack, onSelect }) {
  const plans = [
    { id:"1day",    icon:"📅", label:"1 Day Plan",    sub:"One-time service",      badge:"Standard pricing", color:"#EFF6FF", badgeColor:"#3B82F6" },
    { id:"monthly", icon:"📅", label:"Monthly Plan",  sub:"30-day subscription",   badge:"Save 20%",         color:"#F0FDFA", badgeColor:TEAL },
    { id:"yearly",  icon:"♾️", label:"Yearly Plan",   sub:"365-day subscription",  badge:"Save 20%",         color:"#FAF5FF", badgeColor:"#7C3AED" },
  ];
  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack, label:"Back" }),
    React.createElement("h2", { style:S.pageTitle }, "Choose a Plan"),
    React.createElement("p", { style:{color:GRAY,fontSize:14,margin:"-8px 0 20px"} }, "Monthly & yearly plans are 20% cheaper"),
    plans.map(p =>
      React.createElement("button", { key:p.id, style:{display:"flex",alignItems:"center",gap:14,width:"100%",border:`1.5px solid ${BORDER}`,borderRadius:14,padding:"16px 14px",marginBottom:12,cursor:"pointer",textAlign:"left",background:p.color},
        onClick:()=>onSelect(p.id) },
        React.createElement("div", { style:{width:44,height:44,borderRadius:10,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",flexShrink:0} }, p.icon),
        React.createElement("div", { style:{flex:1} },
          React.createElement("div", { style:{fontWeight:700,fontSize:16,color:DARK} }, p.label),
          React.createElement("div", { style:{fontSize:13,color:GRAY,marginTop:2} }, p.sub)
        ),
        React.createElement("span", { style:{fontSize:13,fontWeight:600,color:p.badgeColor,flexShrink:0} }, p.badge)
      )
    )
  );
}

// ─── SERVICE LIST VIEW ────────────────────────────────────────────────────────
function ServiceListView({ title, subtitle, onBack, onSelect, multiMode, selected, onToggle }) {
  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack }),
    React.createElement("h2", { style:S.pageTitle }, title),
    React.createElement("p", { style:{color:GRAY,fontSize:14,margin:"-8px 0 10px"} }, subtitle),
    multiMode && React.createElement("div", { style:{background:"#FFFBEB",border:`1px solid #FCD34D`,borderRadius:10,padding:"10px 12px",marginBottom:16,fontSize:13,color:"#92400E",display:"flex",gap:8} },
      React.createElement("span", null, "💡"),
      React.createElement("span", null, "Tap a service to select it, then fill in your details")
    ),
    CLEANING_SVCS.map(s => {
      const sel = multiMode && selected && selected.includes(s.id);
      return React.createElement("button", { key:s.id,
        style:{display:"flex",alignItems:"center",gap:12,width:"100%",border:`1.5px solid ${sel?TEAL:BORDER}`,borderRadius:12,padding:14,marginBottom:10,cursor:"pointer",background:sel?TEAL_BG:"#fff",textAlign:"left"},
        onClick:()=>{ multiMode ? onToggle(s.id) : onSelect(s.id); } },
        multiMode && React.createElement("div", { style:{width:22,height:22,borderRadius:"50%",border:`2px solid ${sel?TEAL:BORDER}`,background:sel?TEAL:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0} },
          sel && React.createElement("span", { style:{color:"#fff",fontSize:12} }, "✓")
        ),
        React.createElement("div", { style:{width:36,height:36,borderRadius:8,background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0} }, s.icon),
        React.createElement("span", { style:{fontSize:15,fontWeight:500,color:DARK,flex:1} }, s.label),
        !multiMode && React.createElement("span", { style:{color:TEAL,fontSize:20} }, "›")
      );
    })
  );
}

// ─── SINGLE CONFIG ────────────────────────────────────────────────────────────
function SingleConfig({ svcId, cfg, plan, onBack, onChange, onProceed }) {
  const svc   = CLEANING_SVCS.find(s=>s.id===svcId);
  const price = applyPlan(calcBase(svcId, cfg), plan);
  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack }),
    React.createElement("h2", { style:S.pageTitle }, `${svc.icon} ${svc.label}`),
    svcId==="sweep"
      ? React.createElement("div", null,
          React.createElement("p", { style:{color:GRAY,fontSize:13,marginBottom:12} }, "Select room sizes:"),
          RoomRow("🏠","Large rooms (200+ sq ft) — ₹180",cfg.large||0,()=>onChange("large",Math.max(0,(cfg.large||0)-1)),()=>onChange("large",(cfg.large||0)+1)),
          RoomRow("🛏️","Medium rooms (100–200 sq ft) — ₹120",cfg.medium||0,()=>onChange("medium",Math.max(0,(cfg.medium||0)-1)),()=>onChange("medium",(cfg.medium||0)+1)),
          RoomRow("📦","Small rooms (≤100 sq ft) — ₹80",cfg.small||0,()=>onChange("small",Math.max(0,(cfg.small||0)-1)),()=>onChange("small",(cfg.small||0)+1))
        )
      : React.createElement("div", null,
          React.createElement("p", { style:{color:GRAY,fontSize:13,marginBottom:12} },
            svcId==="toilets"?"How many toilets?":svcId==="bathroom"?"How many bathrooms?":"How many family members?"
          ),
          RoomRow(svcId==="toilets"?"🚽":svcId==="bathroom"?"🚿":"👨‍👩‍👧‍👦",
            svcId==="toilets"?"Toilets":svcId==="bathroom"?"Bathrooms":"Family members",
            cfg.count||0,()=>onChange("count",Math.max(0,(cfg.count||0)-1)),()=>onChange("count",(cfg.count||0)+1))
        ),
    price>0 && React.createElement("button", { style:{...S.primaryBtn,marginTop:24}, onClick:onProceed }, `Proceed to Pay ₹${price} →`)
  );
}

// ─── MULTI CONFIG ─────────────────────────────────────────────────────────────
function MultiConfig({ selected, cfg, plan, onToggle, onChange, total, onProceed, onBack }) {
  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack }),
    CLEANING_SVCS.map(s => {
      const sel  = selected.includes(s.id);
      const scfg = cfg[s.id]||{};
      const pr   = applyPlan(calcBase(s.id, scfg), plan);
      return React.createElement("div", { key:s.id,
        style:{border:`1.5px solid ${sel?TEAL:BORDER}`,borderRadius:14,padding:14,marginBottom:12,background:sel?TEAL_BG:"#fff"} },
        // Header
        React.createElement("div", { style:{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}, onClick:()=>onToggle(s.id) },
          React.createElement("div", { style:{width:24,height:24,borderRadius:"50%",border:`2.5px solid ${sel?TEAL:BORDER}`,background:sel?TEAL:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0} },
            sel && React.createElement("span", { style:{color:"#fff",fontSize:12} }, "✓")
          ),
          React.createElement("div", { style:{width:36,height:36,borderRadius:8,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0} }, s.icon),
          React.createElement("div", { style:{flex:1} },
            React.createElement("div", { style:{fontWeight:700,fontSize:15,color:DARK} }, s.label),
            sel && pr>0 && React.createElement("div", { style:{fontSize:12,color:TEAL,fontWeight:600,marginTop:2} }, `₹${pr} / ${planLabel(plan)}`)
          ),
          React.createElement("span", { style:{color:GRAY,fontSize:18} }, sel?"∧":"∨")
        ),
        // Config
        sel && React.createElement("div", { style:{marginTop:12} },
          s.id==="sweep"
            ? React.createElement("div", null,
                React.createElement("p", { style:{color:GRAY,fontSize:13,marginBottom:10} }, "Select room sizes:"),
                RoomRow("🏠","Large rooms — ₹180",scfg.large||0,()=>onChange(s.id,"large",Math.max(0,(scfg.large||0)-1)),()=>onChange(s.id,"large",(scfg.large||0)+1)),
                RoomRow("🛏️","Medium rooms — ₹120",scfg.medium||0,()=>onChange(s.id,"medium",Math.max(0,(scfg.medium||0)-1)),()=>onChange(s.id,"medium",(scfg.medium||0)+1)),
                RoomRow("📦","Small rooms — ₹80",scfg.small||0,()=>onChange(s.id,"small",Math.max(0,(scfg.small||0)-1)),()=>onChange(s.id,"small",(scfg.small||0)+1))
              )
            : RoomRow("👨‍👩‍👧‍👦",s.id==="toilets"?"Number of toilets":s.id==="bathroom"?"Number of bathrooms":"Family members",
                scfg.count||0,()=>onChange(s.id,"count",Math.max(0,(scfg.count||0)-1)),()=>onChange(s.id,"count",(scfg.count||0)+1))
        )
      );
    }),
    // Sticky total bar
    total>0 && React.createElement("div", { style:{background:"#fff",border:`1.5px solid ${BORDER}`,borderRadius:16,padding:16,marginTop:8,boxShadow:"0 -2px 12px rgba(0,0,0,0.06)"} },
      React.createElement("div", { style:{fontSize:13,color:GRAY,marginBottom:4} }, `${selected.length} service${selected.length>1?"s":""} selected`),
      React.createElement("div", { style:{fontSize:12,color:GRAY,marginBottom:8,lineHeight:1.5} },
        selected.map(id=>CLEANING_SVCS.find(s=>s.id===id).label).join(", ")
      ),
      React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"center"} },
        React.createElement("div", null,
          React.createElement("div", { style:{fontSize:11,color:GRAY,textTransform:"uppercase",letterSpacing:"0.5px"} }, `${planLabel(plan)} total`),
          React.createElement("div", { style:{fontSize:24,fontWeight:900,color:TEAL} }, `₹${total}`)
        ),
        React.createElement("button", { style:{...S.primaryBtn,width:"auto",padding:"12px 20px",margin:0}, onClick:onProceed },
          `Proceed to Pay ₹${total} →`)
      )
    )
  );
}

// ─── CAR WASH ─────────────────────────────────────────────────────────────────
function CarWashView({ onBack, onSelect }) {
  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack }),
    React.createElement("h2", { style:S.pageTitle }, "Car Washing"),
    React.createElement("div", { style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12} },
      React.createElement("button", { style:S.simpleCard, onClick:()=>onSelect("1-Day Car Wash",99,"1day") },
        React.createElement("div", { style:{fontSize:28} }, "🚗"),
        React.createElement("div", { style:{fontWeight:700,fontSize:14,marginTop:8} }, "1-Day Wash"),
        React.createElement("div", { style:{fontSize:22,fontWeight:900,color:TEAL,marginTop:4} }, "₹99")
      ),
      React.createElement("button", { style:S.simpleCard, onClick:()=>onSelect("Monthly Car Wash",1299,"monthly") },
        React.createElement("div", { style:{fontSize:28} }, "📅"),
        React.createElement("div", { style:{fontWeight:700,fontSize:14,marginTop:8} }, "Monthly Wash"),
        React.createElement("div", { style:{fontSize:22,fontWeight:900,color:TEAL,marginTop:4} }, "₹1,299"),
        React.createElement("div", { style:{display:"inline-block",background:TEAL_LIGHT,color:TEAL,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,marginTop:6} }, "Save ₹277")
      )
    )
  );
}

// ─── PUNCTURE VIEW ────────────────────────────────────────────────────────────
function PunctureView({ onBack, onSelect }) {
  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack }),
    React.createElement("h2", { style:S.pageTitle }, "Puncture Fix"),
    React.createElement("div", { style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12} },
      React.createElement("button", { style:S.simpleCard, onClick:()=>onSelect("Bike Puncture Fix",119) },
        React.createElement("div", { style:{fontSize:28} }, "🛵"),
        React.createElement("div", { style:{fontWeight:700,fontSize:14,marginTop:8} }, "Bike Puncture"),
        React.createElement("div", { style:{fontSize:22,fontWeight:900,color:"#7C3AED",marginTop:4} }, "₹119")
      ),
      React.createElement("button", { style:S.simpleCard, onClick:()=>onSelect("Car Puncture Fix",199) },
        React.createElement("div", { style:{fontSize:28} }, "🚗"),
        React.createElement("div", { style:{fontWeight:700,fontSize:14,marginTop:8} }, "Car Puncture"),
        React.createElement("div", { style:{fontSize:22,fontWeight:900,color:"#7C3AED",marginTop:4} }, "₹199")
      )
    )
  );
}

// ─── PROBLEM VIEW ─────────────────────────────────────────────────────────────
function ProblemView({ title, emoji, suggestions, price, text, filtered, onText, onSugg, onBack, onBook }) {
  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack }),
    React.createElement("h2", { style:S.pageTitle }, `${emoji} ${title}`),
    React.createElement("p", { style:{color:GRAY,fontSize:14,margin:"-8px 0 14px"} },
      "From ", React.createElement("strong", { style:{color:TEAL} }, `₹${price}`)
    ),
    React.createElement("textarea", { style:{...S.input,height:100,resize:"none"}, placeholder:"Describe your problem…",
      value:text, onChange:e=>onText(e.target.value) }),
    filtered.length>0 && React.createElement("div", { style:{border:`1.5px solid ${BORDER}`,borderRadius:12,overflow:"hidden",marginTop:4} },
      filtered.slice(0,6).map((s,i) =>
        React.createElement("button", { key:i, style:{display:"block",width:"100%",padding:"10px 14px",background:"#fff",border:"none",borderBottom:`1px solid ${BORDER}`,textAlign:"left",fontSize:13,cursor:"pointer",color:DARK},
          onClick:()=>onSugg(s) }, s)
      )
    ),
    React.createElement("div", { style:{display:"flex",flexWrap:"wrap",gap:6,marginTop:12} },
      suggestions.slice(0,5).map((s,i) =>
        React.createElement("button", { key:i, style:S.chip, onClick:()=>onSugg(s) }, s)
      )
    ),
    React.createElement("button", { style:{...S.primaryBtn,marginTop:20}, onClick:()=>{ if(text.trim()) onBook(); else alert("Please describe your problem."); } },
      `Book Now — ₹${price}`)
  );
}

// ─── BOOKINGS LIST ────────────────────────────────────────────────────────────
function BookingsList({ bookings, onSelect }) {
  return React.createElement("div", { className:"fade-in" },
    React.createElement("h2", { style:S.pageTitle }, "My Bookings"),
    React.createElement("p", { style:{color:GRAY,fontSize:14,margin:"-8px 0 18px"} }, "Your service history"),
    bookings.map(b =>
      React.createElement("div", { key:b.id, className:"booking-card",
        style:{border:`1.5px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12,cursor:"pointer",background:"#fff"},
        onClick:()=>onSelect(b) },
        React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"} },
          React.createElement("div", { style:{fontWeight:700,fontSize:15,color:DARK} }, b.service),
          React.createElement("span", { style:{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#DBEAFE",color:"#1D4ED8",fontWeight:600,flexShrink:0} }, "confirmed")
        ),
        React.createElement("div", { style:{fontSize:13,color:GRAY,margin:"4px 0 2px",lineHeight:1.4} }, b.subServices),
        React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8} },
          React.createElement("span", { style:{fontSize:13,color:GRAY} }, b.date),
          React.createElement("span", { style:{fontSize:16,fontWeight:700,color:TEAL} }, `₹${b.price}`)
        )
      )
    )
  );
}

// ─── BOOKING DETAIL ───────────────────────────────────────────────────────────
function BookingDetail({ booking, onBack }) {
  const today      = new Date();
  const months     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fullMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const calYear    = today.getFullYear();
  const calMonth   = today.getMonth();
  const todayDate  = today.getDate();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const firstDay    = new Date(calYear, calMonth, 1).getDay();

  const isSub = booking.plan==="Monthly" || booking.plan==="Yearly";

  let daysRemaining = 0;
  if (booking.validTill) {
    const p = booking.validTill.split(" ");
    if (p.length===3) {
      const m = months.indexOf(p[1]);
      if (m>=0) {
        const vd = new Date(parseInt(p[2]), m, parseInt(p[0]));
        daysRemaining = Math.max(0, Math.ceil((vd-today)/(1000*60*60*24)));
      }
    }
  }

  function isServiceDay(d) {
    if (!isSub) return d===todayDate;
    return new Date(calYear,calMonth,d).getDay()!==0;
  }

  return React.createElement("div", { className:"fade-in" },
    React.createElement(BackBtn, { onClick:onBack, label:"Back to Bookings" }),
    // Summary card
    React.createElement("div", { style:{border:`1.5px solid ${BORDER}`,borderRadius:16,padding:"18px 16px",marginBottom:18,background:"#fff"} },
      React.createElement("div", { style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14} },
        React.createElement("div", { style:{fontWeight:800,fontSize:18,color:DARK} }, booking.service),
        React.createElement("span", { style:{fontSize:12,padding:"4px 12px",borderRadius:20,background:"#DBEAFE",color:"#1D4ED8",fontWeight:600} }, "confirmed")
      ),
      [["Plan",booking.plan?.toLowerCase()],["Service",booking.subServices],["Amount Paid",null,`₹${booking.price}`],["Date",null,booking.date]].map(([label,val,tVal]) =>
        React.createElement("div", { key:label, style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10} },
          React.createElement("span", { style:{fontSize:14,color:GRAY,minWidth:90} }, label),
          tVal
            ? React.createElement("span", { style:{fontSize:14,fontWeight:700,color:label==="Amount Paid"?TEAL:DARK} }, tVal)
            : React.createElement("span", { style:{fontSize:14,color:DARK,textAlign:"right",maxWidth:210,lineHeight:1.4} }, val)
        )
      )
    ),
    // Calendar
    isSub && React.createElement("div", { style:{border:`1.5px solid ${BORDER}`,borderRadius:16,padding:"18px 16px",background:"#fff"} },
      React.createElement("div", { style:{display:"flex",alignItems:"center",gap:10,marginBottom:18} },
        React.createElement("span", { style:{fontSize:22} }, "📅"),
        React.createElement("span", { style:{fontWeight:800,fontSize:17,color:DARK} }, "Subscription Calendar")
      ),
      // Month header
      React.createElement("div", { style:{textAlign:"center",fontSize:13,fontWeight:700,color:GRAY,marginBottom:10} },
        `${fullMonths[calMonth]} ${calYear}`
      ),
      // Day names
      React.createElement("div", { style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4} },
        ["Su","Mo","Tu","We","Th","Fr","Sa"].map(d =>
          React.createElement("div", { key:d, style:{textAlign:"center",fontSize:11,fontWeight:700,color:"#9CA3AF",padding:"4px 0"} }, d)
        )
      ),
      // Calendar days
      React.createElement("div", { style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4} },
        Array(firstDay).fill(null).map((_,i)=>React.createElement("div",{key:"e"+i})),
        Array.from({length:daysInMonth},(_,i)=>{
          const d=i+1, svc=isServiceDay(d), isToday=d===todayDate;
          return React.createElement("div", { key:d,
            style:{textAlign:"center",padding:"7px 0",borderRadius:"50%",fontSize:13,
              fontWeight:isToday?900:svc?500:400,
              background:isToday?TEAL:svc?TEAL_LIGHT:"transparent",
              color:isToday?"#fff":svc?TEAL:"#9CA3AF"} }, d);
        })
      ),
      // Footer
      React.createElement("div", { style:{marginTop:18,paddingTop:14,borderTop:`1px solid #F3F4F6`} },
        React.createElement("div", { style:{display:"flex",justifyContent:"space-between",marginBottom:8} },
          React.createElement("span", { style:{fontSize:14,color:GRAY} }, "Subscription ends"),
          React.createElement("span", { style:{fontSize:14,fontWeight:700,color:DARK} }, booking.validTill)
        ),
        React.createElement("div", { style:{display:"flex",justifyContent:"space-between"} },
          React.createElement("span", { style:{fontSize:14,color:GRAY} }, "Days remaining"),
          React.createElement("span", { style:{fontSize:14,fontWeight:800,color:TEAL} }, `${daysRemaining} days`)
        )
      )
    )
  );
}

// ─── MAID PORTAL ─────────────────────────────────────────────────────────────
function MaidPortal() {
  const [phone, setPhone]     = React.useState("");
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [maidTab, setMaidTab] = React.useState("dashboard");

  const ORDERS = [
    { id:"O1",customer:"Rahul Sharma",addr:"Gangapur Rd, Nashik",svc:"House Cleaning",time:"9:00 AM", status:"pending",  pay:320 },
    { id:"O2",customer:"Priya Patel", addr:"College Rd, Nashik", svc:"Dish Washing",  time:"11:00 AM",status:"completed",pay:120 },
    { id:"O3",customer:"Amit Joshi",  addr:"Cidco, Nashik",      svc:"Sweeping",      time:"2:00 PM", status:"pending",  pay:200 },
  ];
  const earned = ORDERS.filter(o=>o.status==="completed").reduce((a,b)=>a+b.pay,0);
  const workedDays = [1,3,5,6,8,10,12,13,15,17,19,20,22,24,26,27,29];

  if (!loggedIn) return React.createElement("div", { className:"fade-in" },
    React.createElement("div", { style:{textAlign:"center",marginBottom:28} },
      React.createElement("div", { style:{width:72,height:72,borderRadius:"50%",background:TEAL_LIGHT,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32} }, "💼"),
      React.createElement("h2", { style:{fontSize:24,fontWeight:800,color:DARK,margin:"0 0 6px"} }, "Maid Portal"),
      React.createElement("p", { style:{color:GRAY,fontSize:14} }, "Track orders, earnings & schedule")
    ),
    React.createElement("div", { style:{border:`1.5px solid ${BORDER}`,borderRadius:16,padding:"20px 18px",background:"#fff"} },
      React.createElement("div", { style:{display:"flex",alignItems:"center",gap:8,marginBottom:14} },
        React.createElement("span", { style:{color:TEAL,fontSize:18} }, "→"),
        React.createElement("span", { style:{fontWeight:600,fontSize:15,color:DARK} }, "Login with Phone")
      ),
      React.createElement("input", { style:S.input, placeholder:"Your registered phone number", type:"tel",
        value:phone, onChange:e=>setPhone(e.target.value) }),
      React.createElement("button", { style:{...S.primaryBtn,marginTop:12}, onClick:()=>{ if(phone) setLoggedIn(true); else alert("Enter phone."); } }, "Login")
    ),
    React.createElement("div", { style:{textAlign:"center",marginTop:20} },
      React.createElement("p", { style:{color:GRAY,fontSize:14,marginBottom:8} }, "New to Snabto?"),
      React.createElement("button", { style:{...S.ghostBtn,width:"auto",padding:"10px 28px",display:"inline-block"} }, "Join as a Maid")
    )
  );

  const tabs = [
    {id:"dashboard",icon:"📊",label:"Dashboard"},{id:"orders",icon:"📋",label:"Orders"},
    {id:"calendar",icon:"📅",label:"Calendar"},{id:"earnings",icon:"💰",label:"Earnings"}
  ];

  return React.createElement("div", { className:"fade-in" },
    // Inner tab bar
    React.createElement("div", { style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:`1.5px solid ${BORDER}`,marginBottom:16,marginLeft:-18,marginRight:-18} },
      tabs.map(t => React.createElement("button", { key:t.id,
        style:{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0",border:"none",background:"transparent",cursor:"pointer",gap:2,
          color:maidTab===t.id?TEAL:GRAY,fontWeight:maidTab===t.id?700:400,fontSize:11,
          borderBottom:maidTab===t.id?`2.5px solid ${TEAL}`:"2.5px solid transparent"},
        onClick:()=>setMaidTab(t.id) },
        React.createElement("span", { style:{fontSize:18} }, t.icon), t.label
      ))
    ),

    maidTab==="dashboard" && React.createElement("div", null,
      React.createElement("div", { style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16} },
        [[`₹${earned}`,"Today's Pay"],[ORDERS.filter(o=>o.status==="pending").length,"Pending"],["17","Days Worked"],["4.8⭐","Rating"]].map(([n,l])=>
          React.createElement("div", { key:l, style:{background:"#F9FAFB",borderRadius:12,padding:"14px 12px",border:`1px solid ${BORDER}`} },
            React.createElement("div", { style:{fontSize:18,fontWeight:800,color:DARK} }, n),
            React.createElement("div", { style:{fontSize:11,color:GRAY} }, l)
          )
        )
      ),
      React.createElement("p", { style:{fontWeight:700,fontSize:14,marginBottom:10} }, "Today's Orders"),
      ORDERS.filter(o=>o.status==="pending").map(o => MaidOrderCard(o, false))
    ),

    maidTab==="orders" && React.createElement("div", null,
      React.createElement("p", { style:{fontWeight:700,fontSize:14,marginBottom:10} }, "All Orders"),
      ORDERS.map(o => MaidOrderCard(o, true))
    ),

    maidTab==="calendar" && React.createElement("div", null,
      React.createElement("p", { style:{fontWeight:700,fontSize:14,marginBottom:4} }, "May 2026 — Work Calendar"),
      React.createElement("p", { style:{fontSize:11,color:GRAY,marginBottom:12} }, "🟢 Worked  ⬜ Off"),
      React.createElement("div", { style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:12} },
        ["S","M","T","W","T","F","S"].map((d,i)=>React.createElement("div",{key:i,style:{textAlign:"center",fontSize:10,fontWeight:700,color:"#9CA3AF",paddingBottom:4}},d)),
        [0,1,2].map(i=>React.createElement("div",{key:"e"+i})),
        Array.from({length:31},(_,i)=>{
          const d=i+1, w=workedDays.includes(d);
          return React.createElement("div",{key:d,style:{textAlign:"center",padding:"7px 0",borderRadius:"50%",fontSize:12,fontWeight:w?700:400,background:w?TEAL:"transparent",color:w?"#fff":"#9CA3AF"}},d);
        })
      ),
      React.createElement("div", { style:{background:TEAL_BG,borderRadius:12,padding:12} },
        [["Days Worked","17"],["Days Off","13"],["Monthly Pay","₹5,240"]].map(([k,v])=>
          React.createElement("div",{key:k,style:{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}},
            React.createElement("span",{style:{color:GRAY}},k),
            React.createElement("b",{style:{color:k==="Days Off"?DARK:TEAL}},v)
          )
        )
      )
    ),

    maidTab==="earnings" && React.createElement("div", null,
      React.createElement("div", { style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16} },
        [[`₹${earned}`,"Today"],["₹5,240","This Month"],["₹58,700","Total"],["₹308","Avg/Day"]].map(([n,l])=>
          React.createElement("div",{key:l,style:{background:"#F9FAFB",borderRadius:12,padding:"14px 12px",border:`1px solid ${BORDER}`}},
            React.createElement("div",{style:{fontSize:18,fontWeight:800,color:DARK}},n),
            React.createElement("div",{style:{fontSize:11,color:GRAY}},l)
          )
        )
      ),
      [["May 3","Dish Washing — Priya",120],["May 2","Sweeping — Amit",200],["May 1","Cleaning — Rahul",320],["Apr 30","Cooking — Meena",200]].map(([d,desc,pay])=>
        React.createElement("div",{key:d,style:{display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 14px",marginBottom:8}},
          React.createElement("div",null,React.createElement("div",{style:{fontSize:13,fontWeight:500,color:DARK}},desc),React.createElement("div",{style:{fontSize:11,color:GRAY}},d)),
          React.createElement("b",{style:{color:TEAL}},`₹${pay}`)
        )
      )
    )
  );
}

function MaidOrderCard(o, showStatus) {
  return React.createElement("div", { key:o.id, style:{border:`1px solid ${BORDER}`,borderRadius:12,padding:"12px 14px",marginBottom:10} },
    React.createElement("div", { style:{display:"flex",justifyContent:"space-between"} },
      React.createElement("div", null,
        React.createElement("div",{style:{fontWeight:600,fontSize:13,color:DARK}},o.customer),
        React.createElement("div",{style:{fontSize:11,color:GRAY}},`📍 ${o.addr}`),
        React.createElement("div",{style:{fontSize:11,color:GRAY}},`🕐 ${o.time} — ${o.svc}`)
      ),
      React.createElement("div", { style:{textAlign:"right"} },
        React.createElement("div",{style:{fontWeight:700,color:TEAL}},`₹${o.pay}`),
        showStatus && React.createElement("div",{style:{fontSize:10,marginTop:4,padding:"2px 8px",borderRadius:20,background:o.status==="completed"?TEAL_LIGHT:"#FEF3C7",color:o.status==="completed"?TEAL:"#92400E"}},
          o.status==="completed"?"✓ Done":"⏳")
      )
    ),
    o.status==="pending" && React.createElement("button",{style:{width:"100%",marginTop:8,padding:"8px 0",background:TEAL_LIGHT,color:TEAL,border:`1.5px solid ${TEAL}`,borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
      onClick:()=>alert(`✅ Order ${o.id} marked complete! Customer notified via SMS.`)},
      "Mark as Completed ✓")
  );
}

// ─── HELPLINE TAB ─────────────────────────────────────────────────────────────
function HelplineTab() {
  return React.createElement("div", { className:"fade-in" },
    React.createElement("h2", { style:S.pageTitle }, "Customer Helpline"),
    React.createElement("p", { style:{color:GRAY,fontSize:14,margin:"-8px 0 24px"} }, "We're here to help you 7 days a week"),
    [
      {icon:"📞",bg:"#DCFCE7",label:"Call Us",        sub:"+91 99999 99999",            action:"tel:+919999999999"},
      {icon:"💬",bg:"#CCFBF1",label:"WhatsApp",       sub:"Chat with us on WhatsApp",   action:"https://wa.me/919999999999"},
      {icon:"✉️",bg:"#DBEAFE",label:"Email",          sub:"support@snabto.in",          action:"mailto:support@snabto.in"},
      {icon:"🕐",bg:"#FEF3C7",label:"Working Hours",  sub:"Mon – Sun: 7:00 AM – 9:00 PM", action:null},
    ].map(item =>
      React.createElement("a", { key:item.label, href:item.action||"#",
        style:{display:"flex",alignItems:"center",gap:16,background:"#fff",border:`1.5px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:14,textDecoration:"none",cursor:item.action?"pointer":"default"} },
        React.createElement("div", { style:{width:48,height:48,borderRadius:"50%",background:item.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0} }, item.icon),
        React.createElement("div", null,
          React.createElement("div",{style:{fontWeight:700,fontSize:15,color:DARK}},item.label),
          React.createElement("div",{style:{fontSize:13,color:GRAY,marginTop:2}},item.sub)
        )
      )
    )
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Shell({ children }) {
  return React.createElement("div", { style:{minHeight:"100vh",background:"#E5E7EB",display:"flex",justifyContent:"center"} },
    React.createElement("div", { style:{width:"100%",maxWidth:430,minHeight:"100vh",background:"#fff",display:"flex",flexDirection:"column",boxShadow:"0 0 40px rgba(0,0,0,0.15)"} },
      children
    )
  );
}

function TopBar({ loc }) {
  return React.createElement("div", { style:{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:`1.5px solid ${BORDER}`,background:"#fff",position:"sticky",top:0,zIndex:20} },
    React.createElement("img", { src:IMGS.logo, alt:"Snabto", style:{width:32,height:32,borderRadius:8,objectFit:"cover",flexShrink:0} }),
    React.createElement("span", { className:"snabto-name", style:{fontSize:19} }, "Snabto"),
    loc && React.createElement("span", { style:{fontSize:13,color:GRAY,marginLeft:2} }, loc.split(",")[0])
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    {id:"home",    icon:"🏠", label:"Home"},
    {id:"bookings",icon:"📖", label:"Bookings"},
    {id:"maid",    icon:"💼", label:"Maid Portal"},
    {id:"help",    icon:"📞", label:"Helpline"},
  ];
  return React.createElement("div", { style:{position:"sticky",bottom:0,display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:"#fff",borderTop:`1.5px solid ${BORDER}`,zIndex:20} },
    items.map(t =>
      React.createElement("button", { key:t.id,
        style:{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0 10px",border:"none",background:"transparent",cursor:"pointer",gap:2,
          color:tab===t.id?TEAL:GRAY,fontWeight:tab===t.id?700:400,fontSize:10,
          borderTop:tab===t.id?`2.5px solid ${TEAL}`:"2.5px solid transparent"},
        onClick:()=>setTab(t.id) },
        React.createElement("span",{style:{fontSize:20}},t.icon), t.label
      )
    )
  );
}

function BackBtn({ onClick, label }) {
  return React.createElement("button", {
    onClick, style:{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:GRAY,fontSize:14,cursor:"pointer",padding:"0 0 14px 0"}
  }, `‹ ${label||"Back"}`);
}

function RoomRow(emoji, label, val, onDec, onInc) {
  return React.createElement("div", { key:label, style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#F9FAFB",borderRadius:10,marginBottom:10} },
    React.createElement("div", { style:{display:"flex",alignItems:"center",gap:8} },
      React.createElement("span",{style:{fontSize:18}},emoji),
      React.createElement("span",{style:{fontSize:13,color:DARK}},label)
    ),
    React.createElement("div", { style:{display:"flex",alignItems:"center",gap:12} },
      React.createElement("button",{style:{width:32,height:32,borderRadius:"50%",border:`2px solid ${BORDER}`,background:"#fff",color:DARK,fontSize:18,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},onClick:onDec},"−"),
      React.createElement("span",{style:{fontSize:16,fontWeight:700,minWidth:22,textAlign:"center",color:DARK}},val),
      React.createElement("button",{style:{width:32,height:32,borderRadius:"50%",border:`2px solid ${TEAL}`,background:TEAL,color:"#fff",fontSize:18,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},onClick:onInc},"+")
    )
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  label:     { display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 },
  input:     { width:"100%", padding:"12px 14px", border:`1.5px solid ${BORDER}`, borderRadius:12, fontSize:14, outline:"none", boxSizing:"border-box", background:"#fff", color:DARK },
  primaryBtn:{ width:"100%", padding:"14px 0", background:TEAL, color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor:"pointer" },
  ghostBtn:  { width:"100%", padding:"12px 0", background:"transparent", color:TEAL, border:`1.5px solid ${TEAL}`, borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", marginTop:10 },
  linkBtn:   { background:"none", border:"none", color:TEAL, fontSize:14, cursor:"pointer", textDecoration:"underline" },
  pageTitle: { fontSize:22, fontWeight:800, color:DARK, margin:"0 0 14px", letterSpacing:"-0.3px" },
  simpleCard:{ border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"20px 12px", cursor:"pointer", background:"#fff", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" },
  chip:      { padding:"5px 12px", background:"#F3F4F6", border:`1px solid ${BORDER}`, borderRadius:20, fontSize:12, cursor:"pointer", color:DARK },
};

// ─── MOUNT ────────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
