/* global React */
const { useState, useRef, useEffect } = React;

// ---------- Icon ----------
const Icon = ({ name, size = 14, ...p }) => {
  const paths = {
    layout: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    chevron: <polyline points="6 9 12 15 18 9"/>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    pencil: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    more: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    mouse: <><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v4"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    minus: <line x1="5" y1="12" x2="19" y2="12"/>,
    fit: <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    hand: <><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></>,
    chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="1.5"
      fill="none" strokeLinecap="round" strokeLinejoin="round" {...p}>
      {paths[name]}
    </svg>
  );
};

// ---------- Logo ----------
const Logo = ({ height = 20 }) => (
  <svg viewBox="0 0 32 32" height={height} style={{display: 'block'}}>
    <circle cx="7" cy="22" r="3.25" fill="#111110"/>
    <circle cx="7" cy="8" r="3.25" fill="#111110"/>
    <circle cx="24" cy="14" r="3.75" fill="#5B42E8"/>
    <path d="M9.8 7.2 L21.2 12.6" stroke="#111110" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M9.5 20.2 L21.4 15.4" stroke="#111110" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M7 11 L7 19" stroke="#111110" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

// ---------- Topbar ----------
const Topbar = ({ mode, setMode, onGenerate }) => (
  <div className="topbar">
    <div className="topbar-logo"><Logo height={20}/></div>
    <div className="topbar-project">
      Checkout flow v2
      <Icon name="chevron" size={12}/>
    </div>
    <div className="topbar-spacer"/>
    <div className="mode-switch">
      <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>
        <Icon name="pencil" size={12}/> Edit
      </button>
      <button className={mode === 'sim' ? 'active' : ''} onClick={() => setMode('sim')}>
        <Icon name="play" size={12}/> Simulation
      </button>
    </div>
    <button className="btn btn-ghost btn-icon" title="Comments"><Icon name="chat" size={14}/></button>
    <button className="btn btn-primary" onClick={onGenerate}>
      <Icon name="zap" size={14}/> Generate prompt
    </button>
  </div>
);

// ---------- Sidebar ----------
const SidebarSection = ({ title, items, active, onPick }) => (
  <div className="sidebar-section">
    <div className="sidebar-section-head">
      <span className="title">{title}</span>
      <button title={`Add ${title}`}><Icon name="plus" size={12}/></button>
    </div>
    {items.map((it) => (
      <div key={it.id}
        className={`sidebar-item ${active === it.id ? 'active' : ''}`}
        onClick={() => onPick(it.id)}>
        <Icon name={it.icon} size={14}/>
        <span>{it.name}</span>
        {it.count != null && <span className="count">{it.count}</span>}
      </div>
    ))}
  </div>
);

const Sidebar = ({ graph, selected, setSelected }) => {
  const screens = graph.nodes.filter(n => n.type === 'screen').map(n => ({id: n.id, name: n.data.name, icon: 'layout'}));
  const apis    = graph.nodes.filter(n => n.type === 'api').map(n => ({id: n.id, name: `${n.data.method} ${n.data.path}`, icon: 'zap'}));
  const models  = graph.nodes.filter(n => n.type === 'model').map(n => ({id: n.id, name: n.data.name, icon: 'database', count: n.data.fields.length}));
  const roles   = graph.nodes.filter(n => n.type === 'role').map(n => ({id: n.id, name: n.data.name, icon: 'user'}));
  return (
    <div className="sidebar">
      <SidebarSection title="Screens" items={screens} active={selected} onPick={setSelected}/>
      <SidebarSection title="API Endpoints" items={apis} active={selected} onPick={setSelected}/>
      <SidebarSection title="Data Models" items={models} active={selected} onPick={setSelected}/>
      <SidebarSection title="Roles" items={roles} active={selected} onPick={setSelected}/>
    </div>
  );
};

// ---------- Node ----------
const NODE_META = {
  screen: { icon: 'layout', label: 'Screen', cls: 'header-screen', dot: '#1F4DB8' },
  ui:     { icon: 'mouse',  label: 'UI Element', cls: 'header-ui',  dot: '#4A32D1' },
  api:    { icon: 'zap',    label: 'API',    cls: 'header-api',    dot: '#1F7A4A' },
  model:  { icon: 'database', label: 'Data Model', cls: 'header-model', dot: '#9A4A12' },
  role:   { icon: 'user',   label: 'Role',   cls: 'header-role',   dot: '#9A2A5C' },
};

const Node = ({ node, selected, onSelect }) => {
  const meta = NODE_META[node.type];
  return (
    <div className={`node ${selected ? 'selected' : ''}`}
         style={{ left: node.x, top: node.y, width: node.w || 220 }}
         onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}>
      <div className={`node-header ${meta.cls}`}>
        <span className="dot" style={{background: meta.dot}}/>
        <Icon name={meta.icon} size={12}/>
        <span>{meta.label}</span>
        <span className="spacer"/>
        <Icon name="more" size={12} className="more"/>
      </div>
      <div className="node-body">
        {node.type === 'screen' && (
          <>
            <div className="node-title">{node.data.name}</div>
            <div className="node-sub">/{node.data.route}</div>
            <div className="node-ui-list">
              {node.data.elements.map((el, i) => (
                <div key={i} className="node-ui-chip">
                  <Icon name={el.icon} size={11}/> {el.label}
                </div>
              ))}
            </div>
          </>
        )}
        {node.type === 'api' && (
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span className={`method method-${node.data.method.toLowerCase()}`}>{node.data.method}</span>
            <span className="node-sub" style={{margin: 0}}>{node.data.path}</span>
          </div>
        )}
        {node.type === 'model' && (
          <>
            <div className="node-title">{node.data.name}</div>
            <div className="node-field-list">
              {node.data.fields.map((f, i) => (
                <div key={i} className="node-field">
                  <span>{f.name}</span>
                  <span className="type">{f.type}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {node.type === 'role' && (
          <>
            <div className="node-title">{node.data.name}</div>
            <div className="node-sub">{node.data.count} {node.data.count === 1 ? 'member' : 'members'}</div>
          </>
        )}
      </div>
    </div>
  );
};

// ---------- Edges ----------
const CONN_LABEL = {
  opens: 'opens',
  calls: 'calls API',
  reads: 'reads data',
  writes: 'writes data',
  updates: 'updates',
};

const Edges = ({ nodes, edges, activeEdgeId }) => {
  const pos = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <svg className="canvas-svg">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--neutral-5)"/>
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--signal-5)"/>
        </marker>
      </defs>
      {edges.map((e) => {
        const a = pos[e.from], b = pos[e.to];
        if (!a || !b) return null;
        const ax = a.x + (a.w || 220), ay = a.y + 40;
        const bx = b.x, by = b.y + 40;
        const dx = Math.max(60, (bx - ax) / 2);
        const path = `M ${ax} ${ay} C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
        const active = activeEdgeId === e.id;
        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2;
        const label = CONN_LABEL[e.kind];
        const lw = label.length * 6 + 16;
        return (
          <g key={e.id}>
            <path d={path} className={`edge-path ${active ? 'active' : ''}`} markerEnd={`url(#${active ? 'arrow-active' : 'arrow'})`}/>
            <rect className="edge-label-bg" x={midX - lw/2} y={midY - 9} width={lw} height={18} rx="9"/>
            <text x={midX} y={midY + 3} className="edge-label" textAnchor="middle">{label} →</text>
          </g>
        );
      })}
    </svg>
  );
};

// ---------- Canvas ----------
const Canvas = ({ graph, selected, setSelected, activeEdgeId }) => {
  const wrapRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = wrapRef.current.clientHeight;
      // Fit content (roughly 1180 x 600) into viewport with padding
      const needed = 1180, neededH = 600;
      const z = Math.max(0.55, Math.min(1, Math.min((w - 40) / needed, (h - 100) / neededH)));
      setZoom(z);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="canvas-wrap" ref={wrapRef} onClick={() => setSelected(null)}>
      <div className="canvas-surface" style={{transform: `translate(20px, 20px) scale(${zoom})`}}>
        <Edges nodes={graph.nodes} edges={graph.edges} activeEdgeId={activeEdgeId}/>
        {graph.nodes.map(n => (
          <Node key={n.id} node={n} selected={selected === n.id} onSelect={setSelected}/>
        ))}
      </div>
      <div className="canvas-toolbar" onClick={e => e.stopPropagation()}>
        <button title="Select"><Icon name="mouse" size={14}/></button>
        <button title="Pan"><Icon name="hand" size={14}/></button>
        <div className="sep"/>
        <button title="Zoom out"><Icon name="minus" size={14}/></button>
        <span className="zoom">{Math.round(zoom * 100)}%</span>
        <button title="Zoom in"><Icon name="plus" size={14}/></button>
        <button title="Fit to screen"><Icon name="fit" size={14}/></button>
      </div>
    </div>
  );
};

// ---------- Inspector ----------
const Inspector = ({ graph, selectedId }) => {
  const node = graph.nodes.find(n => n.id === selectedId);
  if (!node) {
    return (
      <div className="inspector">
        <div className="inspector-empty">
          <div className="big">Nothing selected.</div>
          Click a node to inspect it.
        </div>
      </div>
    );
  }
  const meta = NODE_META[node.type];
  const conns = graph.edges.filter(e => e.from === node.id).map(e => ({
    kind: e.kind, to: graph.nodes.find(n => n.id === e.to)
  })).filter(c => c.to);

  return (
    <div className="inspector">
      <div className="inspector-header">
        <div className="inspector-eyebrow">
          <span style={{width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block'}}/>
          {meta.label}
        </div>
        <div className="inspector-title">{node.data.name || `${node.data.method} ${node.data.path}`}</div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Details</div>
        {node.type === 'screen' && (
          <>
            <div className="field-row">
              <span className="field-label">Name</span>
              <input className="input" defaultValue={node.data.name}/>
            </div>
            <div className="field-row">
              <span className="field-label">Route</span>
              <input className="input" defaultValue={`/${node.data.route}`}/>
            </div>
          </>
        )}
        {node.type === 'model' && (
          <div className="field-row">
            <span className="field-label">Entity name</span>
            <input className="input" defaultValue={node.data.name}/>
          </div>
        )}
        {node.type === 'api' && (
          <>
            <div className="field-row">
              <span className="field-label">Method</span>
              <input className="input" defaultValue={node.data.method}/>
            </div>
            <div className="field-row">
              <span className="field-label">Path</span>
              <input className="input" defaultValue={node.data.path}/>
            </div>
          </>
        )}
      </div>

      {node.type === 'model' && (
        <div className="inspector-section">
          <div className="inspector-section-title">
            Fields
            <button title="Add field"><Icon name="plus" size={12}/></button>
          </div>
          {node.data.fields.map((f, i) => (
            <div key={i} className="data-row">
              <span className="name">{f.name}</span>
              <span className="type-chip">{f.type}</span>
              {f.required && <span className="req">REQ</span>}
              {!f.required && <span style={{width: 32}}/>}
            </div>
          ))}
        </div>
      )}

      {node.type === 'screen' && (
        <div className="inspector-section">
          <div className="inspector-section-title">
            UI elements
            <button title="Add element"><Icon name="plus" size={12}/></button>
          </div>
          {node.data.elements.map((el, i) => (
            <div key={i} className="data-row">
              <span className="name" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <Icon name={el.icon} size={13}/>
                {el.label}
              </span>
              <span className="type-chip">{el.kind}</span>
              <span style={{width: 32}}/>
            </div>
          ))}
        </div>
      )}

      <div className="inspector-section">
        <div className="inspector-section-title">Connections ({conns.length})</div>
        {conns.length === 0 && <div style={{fontSize: 12, color: 'var(--fg-4)'}}>No outgoing connections.</div>}
        {conns.map((c, i) => (
          <div key={i} className="connection-row">
            <span className="arrow">{CONN_LABEL[c.kind]} →</span>
            <span className="target">{c.to.data.name || c.to.data.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Simulation ----------
const SimScreen = ({ screenId, graph, onNav }) => {
  const screen = graph.nodes.find(n => n.id === screenId);
  if (!screen) return null;
  const name = screen.data.name;
  if (name === 'Login') {
    return (
      <>
        <div style={{padding: '60px 24px 24px'}}>
          <h1 className="proto-h">Welcome back</h1>
          <p className="proto-sub">Sign in to Checkout flow v2.</p>
          <div className="proto-field"><label>Email</label><input defaultValue="alex@studio.co"/></div>
          <div className="proto-field"><label>Password</label><input type="password" defaultValue="••••••••"/></div>
          <button className="proto-btn" onClick={() => onNav('cart')}>Sign in</button>
          <button className="proto-btn secondary" style={{marginTop: 8}}>Create account</button>
        </div>
      </>
    );
  }
  if (name === 'Cart') {
    return (
      <div style={{padding: '32px 20px'}}>
        <h1 className="proto-h">Your cart</h1>
        <p className="proto-sub">2 items · $86.00</p>
        <div className="proto-list-item">
          <span style={{display: 'flex', alignItems: 'center'}}><span className="ico">A</span>Arc lamp · Walnut</span>
          <span style={{fontFamily: 'Geist Mono', fontSize: 13}}>$54.00</span>
        </div>
        <div className="proto-list-item">
          <span style={{display: 'flex', alignItems: 'center'}}><span className="ico">B</span>Ceramic mug</span>
          <span style={{fontFamily: 'Geist Mono', fontSize: 13}}>$32.00</span>
        </div>
        <button className="proto-btn" style={{marginTop: 16}} onClick={() => onNav('checkout')}>Continue to checkout</button>
      </div>
    );
  }
  if (name === 'Checkout') {
    return (
      <div style={{padding: '32px 20px'}}>
        <h1 className="proto-h">Checkout</h1>
        <p className="proto-sub">Enter shipping details.</p>
        <div className="proto-field"><label>Full name</label><input defaultValue="Alex Mori"/></div>
        <div className="proto-field"><label>Address</label><input defaultValue="48 Orchard St, Apt 3"/></div>
        <div className="proto-field"><label>City</label><input defaultValue="Brooklyn, NY 11201"/></div>
        <button className="proto-btn" onClick={() => onNav('confirm')}>Place order</button>
      </div>
    );
  }
  return (
    <div style={{padding: '40px 20px', textAlign: 'center'}}>
      <h1 className="proto-h">Order confirmed</h1>
      <p className="proto-sub">Receipt sent to alex@studio.co.</p>
      <div style={{fontFamily: 'Geist Mono', fontSize: 12, padding: 12, background: 'var(--neutral-1)', borderRadius: 8, color: 'var(--fg-3)'}}>
        #ORD-4821 · 2 items
      </div>
    </div>
  );
};

const Simulation = ({ graph }) => {
  const screens = graph.nodes.filter(n => n.type === 'screen');
  const [screenId, setScreenId] = useState(screens[0].id);
  const [log, setLog] = useState([
    { t: '0.00s', m: 'GET', method: 'get', p: '/auth/session' },
  ]);

  const nav = (name) => {
    const next = screens.find(s => s.data.name.toLowerCase() === name);
    if (!next) return;
    const api = graph.nodes.find(n => n.type === 'api' && n.data.path.includes(name));
    const entry = api
      ? { t: `${(log.length * 0.42).toFixed(2)}s`, m: api.data.method, method: api.data.method.toLowerCase(), p: api.data.path }
      : { t: `${(log.length * 0.42).toFixed(2)}s`, m: '→', method: 'get', p: `navigate to ${name}` };
    setLog(l => [...l, entry]);
    setScreenId(next.id);
  };
  const current = graph.nodes.find(n => n.id === screenId);

  return (
    <div className="sim-container">
      <div className="sim-breadcrumb">
        <Icon name="home" size={12}/>
        <span style={{color: 'var(--fg-3)'}}>Flow</span>
        <Icon name="chevron" size={12} style={{transform: 'rotate(-90deg)'}}/>
        <span style={{fontWeight: 500}}>{current.data.name}</span>
      </div>

      <div className="sim-device">
        <div className="status-bar">
          <span>9:41</span>
          <span style={{display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12}}>
            <span>●●●</span><span>Brainer</span>
          </span>
        </div>
        <div className="sim-screen" key={screenId} style={{animation: 'slideIn 260ms cubic-bezier(0.22, 1, 0.36, 1)'}}>
          <SimScreen screenId={screenId} graph={graph} onNav={nav}/>
        </div>
      </div>

      <div className="sim-panel">
        <div style={{fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 8}}>
          Mock data · User
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 8px', fontSize: 12}}>
          <span style={{color: 'var(--fg-3)'}}>email</span><span style={{fontFamily: 'var(--font-mono)', fontSize: 11}}>alex@studio.co</span>
          <span style={{color: 'var(--fg-3)'}}>verified</span><span style={{fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--success)'}}>true</span>
          <span style={{color: 'var(--fg-3)'}}>role</span><span style={{fontFamily: 'var(--font-mono)', fontSize: 11}}>customer</span>
        </div>
      </div>

      <div className="sim-log">
        <div className="sim-log-head">
          <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
            <span style={{width: 6, height: 6, borderRadius: '50%', background: 'var(--success)'}}/> Network
          </span>
          <span style={{fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-4)'}}>{log.length} calls</span>
        </div>
        <div className="sim-log-body">
          {log.map((r, i) => (
            <div key={i} className="sim-log-row">
              <span className="t">{r.t}</span>
              <span className={`m ${r.method}`}>{r.m}</span>
              <span>{r.p}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

// ---------- Sample graph ----------
const SAMPLE = {
  nodes: [
    { id: 'r1', type: 'role', x: 20, y: 40, w: 160, data: { name: 'Customer', count: 24 } },
    { id: 's1', type: 'screen', x: 210, y: 20, w: 180,
      data: { name: 'Login', route: 'auth/login', elements: [
        { icon: 'mail', label: 'Email field', kind: 'input' },
        { icon: 'lock', label: 'Password field', kind: 'input' },
        { icon: 'arrowRight', label: 'Sign in', kind: 'button' },
      ]}},
    { id: 's2', type: 'screen', x: 460, y: 20, w: 180,
      data: { name: 'Cart', route: 'cart', elements: [
        { icon: 'layout', label: 'Item list', kind: 'list' },
        { icon: 'arrowRight', label: 'Continue', kind: 'button' },
      ]}},
    { id: 's3', type: 'screen', x: 710, y: 20, w: 180,
      data: { name: 'Checkout', route: 'checkout', elements: [
        { icon: 'mail', label: 'Address form', kind: 'form' },
        { icon: 'arrowRight', label: 'Place order', kind: 'button' },
      ]}},
    { id: 's4', type: 'screen', x: 960, y: 20, w: 180,
      data: { name: 'Confirm', route: 'confirm', elements: [
        { icon: 'arrowRight', label: 'Summary card', kind: 'card' },
      ]}},

    { id: 'a1', type: 'api', x: 210, y: 280, w: 180, data: { method: 'POST', path: '/api/auth' } },
    { id: 'a2', type: 'api', x: 460, y: 280, w: 180, data: { method: 'GET',  path: '/api/cart' } },
    { id: 'a3', type: 'api', x: 710, y: 280, w: 180, data: { method: 'POST', path: '/api/checkout' } },

    { id: 'm1', type: 'model', x: 210, y: 410, w: 200,
      data: { name: 'User', fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
        { name: 'verified', type: 'boolean' },
      ]}},
    { id: 'm2', type: 'model', x: 470, y: 410, w: 200,
      data: { name: 'Order', fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'items', type: 'array' },
        { name: 'total', type: 'number', required: true },
        { name: 'placedAt', type: 'date' },
      ]}},
  ],
  edges: [
    { id: 'e1', from: 'r1', to: 's1', kind: 'opens' },
    { id: 'e2', from: 's1', to: 's2', kind: 'opens' },
    { id: 'e3', from: 's2', to: 's3', kind: 'opens' },
    { id: 'e4', from: 's3', to: 's4', kind: 'opens' },
    { id: 'e5', from: 's1', to: 'a1', kind: 'calls' },
    { id: 'e6', from: 's2', to: 'a2', kind: 'calls' },
    { id: 'e7', from: 's3', to: 'a3', kind: 'calls' },
    { id: 'e8', from: 'a1', to: 'm1', kind: 'reads' },
    { id: 'e9', from: 'a3', to: 'm2', kind: 'writes' },
  ],
};

// ---------- App ----------
const App = () => {
  const [mode, setMode] = useState('edit');
  const [selected, setSelected] = useState('m2');

  return (
    <div className={`app ${mode === 'sim' ? 'sim' : ''}`}>
      <Topbar mode={mode} setMode={setMode} onGenerate={() => alert('Generated development prompt (mock).')}/>
      {mode === 'edit' && <Sidebar graph={SAMPLE} selected={selected} setSelected={setSelected}/>}
      {mode === 'edit' && <Canvas graph={SAMPLE} selected={selected} setSelected={setSelected} activeEdgeId="e9"/>}
      {mode === 'edit' && <Inspector graph={SAMPLE} selectedId={selected}/>}
      {mode === 'sim' && <Simulation graph={SAMPLE}/>}
    </div>
  );
};

Object.assign(window, { App });
